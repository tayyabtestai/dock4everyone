/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Public funnel submission — runs with the PUBLISHABLE (anon) key only, so it
 * needs NO service-role key and never throws "Missing SUPABASE_SERVICE_ROLE_KEY".
 *
 * Flow: load the published snapshot (anon RPC) → recompute the result
 * server-side (authoritative; the browser only sends raw answers) → persist via
 * the SECURITY DEFINER `rr_submit_public` RPC (dedupes the lead, stores the
 * submission + activity + events). If that RPC isn't present yet, we fall back
 * to a plain anon INSERT of the submission + events (RLS already allows it) so
 * the customer STILL gets their report — no hard error either way. The full
 * report model is returned so the report renders instantly with no read-back.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  buildResult,
  type Answers,
  type Contact,
  type FunnelResult,
  type FunnelSnapshot,
} from "./engine";
import { buildReport, type ReportModel } from "./report";

export type FunnelSubmitInput = {
  slug: string;
  answers: Answers;
  contact: Contact;
  sessionId?: string;
  meta?: { device?: string; referrer?: string; source?: string; durationMs?: number };
};

export type FunnelSubmitResult = {
  submissionId: string;
  report: ReportModel;
  result: FunnelResult;
};

export async function handleFunnelSubmit(input: FunnelSubmitInput): Promise<FunnelSubmitResult> {
  const sb = supabase as any;

  // 1. Load the published snapshot (anon RPC — no elevated key needed).
  const { data, error } = await sb.rpc("rr_get_published_by_slug", { _slug: input.slug });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.snapshot) throw new Error("This funnel is not available.");
  const snapshot = row.snapshot as FunnelSnapshot;
  const calcId: string = row.calculator_id;

  const industry = typeof input.answers.industry === "string" ? input.answers.industry : null;

  // 2. Server-authoritative recompute + report.
  const result = buildResult(snapshot, input.answers, industry);
  const report = buildReport(snapshot, input.answers, result, input.contact);

  const submissionId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

  const financial = { outputs: result.outputs };

  // 3. Persist via the SECURITY DEFINER RPC (lead dedupe + submission + events).
  const rpc = await sb.rpc("rr_submit_public", {
    p_id: submissionId,
    p_slug: input.slug,
    p_industry: industry,
    p_answers: input.answers,
    p_score: result.score.normalized,
    p_score_breakdown: result.score.byQuestion,
    p_financial: financial,
    p_recommendations: result.recommendations,
    p_contact: input.contact,
    p_session: input.sessionId ?? null,
  });

  if (rpc.error) {
    // Fallback: the RPC isn't deployed yet. Store what anon RLS permits so the
    // customer still gets their report (lead creation resumes once the RPC lands).
    console.warn("[funnel] rr_submit_public unavailable, using anon fallback:", rpc.error.message);
    await sb.from("rr_submissions").insert({
      id: submissionId,
      calculator_id: calcId,
      version_id: row.version_id ?? null,
      slug: input.slug,
      industry,
      answers: input.answers,
      score: result.score.normalized,
      score_breakdown: result.score.byQuestion,
      financial_impact: financial,
      recommendations: result.recommendations,
      contact: input.contact,
      session_id: input.sessionId ?? null,
    });
    await sb.from("rr_events").insert([
      {
        calculator_id: calcId,
        slug: input.slug,
        session_id: input.sessionId ?? null,
        event: "contact_submitted",
        industry,
        payload: {},
      },
      {
        calculator_id: calcId,
        slug: input.slug,
        session_id: input.sessionId ?? null,
        event: "completed",
        industry,
        payload: { score: result.score.normalized },
      },
    ]);
  }

  return { submissionId, report, result };
}
