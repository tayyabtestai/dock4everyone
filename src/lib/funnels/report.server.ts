/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Server loader for a personalised report. Reads a stored submission (service
 * role — rr_submissions is admin-only), rebuilds the exact funnel snapshot the
 * customer answered against, recomputes the result server-side (authoritative),
 * and returns the derived report model. Returns null if the submission or its
 * funnel version can't be found.
 */
import { buildResult, type Answers, type FunnelSnapshot } from "./engine";
import { buildReport, type ReportModel } from "./report";

export async function getReportModel(submissionId: string): Promise<ReportModel | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sb = supabaseAdmin as any;

  const { data: sub, error } = await sb
    .from("rr_submissions")
    .select("id, calculator_id, version_id, slug, answers, contact, industry")
    .eq("id", submissionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!sub) return null;

  // Prefer the exact version the customer answered; fall back to the published
  // snapshot, then to the live rows.
  let snapshot: FunnelSnapshot | null = null;
  if (sub.version_id) {
    const { data: ver } = await sb
      .from("rr_calculator_versions")
      .select("snapshot")
      .eq("id", sub.version_id)
      .maybeSingle();
    snapshot = (ver?.snapshot as FunnelSnapshot) ?? null;
  }
  if (!snapshot && sub.slug) {
    const { data } = await sb.rpc("rr_get_published_by_slug", { _slug: sub.slug });
    const row = Array.isArray(data) ? data[0] : data;
    snapshot = (row?.snapshot as FunnelSnapshot) ?? null;
  }
  if (!snapshot && sub.calculator_id) {
    const { assembleSnapshot } = await import("./snapshot.server");
    snapshot = await assembleSnapshot(sb, sub.calculator_id);
  }
  if (!snapshot || !Array.isArray(snapshot.questions)) return null;

  const answers = (sub.answers as Answers) ?? {};
  const industry =
    (sub.industry as string | null) ??
    (typeof answers.industry === "string" ? (answers.industry as string) : null);

  const result = buildResult(snapshot, answers, industry);
  return buildReport(snapshot, answers, result, sub.contact ?? null);
}
