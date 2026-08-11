/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Server loader for a personalised report — anon key only (no service-role).
 * The immediate post-submit view is served from the seeded query cache, so this
 * only runs for SHARED / reloaded report links: it reads the submission via the
 * SECURITY DEFINER `rr_get_submission_public` RPC, rebuilds the published
 * snapshot via `rr_get_published_by_slug`, recomputes, and builds the model.
 * Returns null (→ graceful "report not found") if the submission or its funnel
 * can't be read.
 */
import { supabase } from "@/integrations/supabase/client";
import { buildResult, type Answers, type Contact, type FunnelSnapshot } from "./engine";
import { buildReport, type ReportModel } from "./report";

export async function getReportModel(submissionId: string): Promise<ReportModel | null> {
  const sb = supabase as any;

  const { data: subRows, error } = await sb.rpc("rr_get_submission_public", { p_id: submissionId });
  if (error) return null; // RPC not deployed yet, or not permitted
  const sub = Array.isArray(subRows) ? subRows[0] : subRows;
  if (!sub) return null;

  const { data: fRows } = await sb.rpc("rr_get_published_by_slug", { _slug: sub.slug });
  const fRow = Array.isArray(fRows) ? fRows[0] : fRows;
  const snapshot = (fRow?.snapshot as FunnelSnapshot) ?? null;
  if (!snapshot || !Array.isArray(snapshot.questions)) return null;

  const answers = (sub.answers as Answers) ?? {};
  const industry =
    (sub.industry as string | null) ??
    (typeof answers.industry === "string" ? (answers.industry as string) : null);

  const result = buildResult(snapshot, answers, industry);
  return buildReport(snapshot, answers, result, (sub.contact as Contact) ?? null);
}
