/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Public funnel submission (server-authoritative). Loads the PUBLISHED snapshot,
 * recomputes score / calculations / recommendations from the raw answers (never
 * trusting the browser), creates or updates a Lead (deduped by email, tagged
 * source = Funnel), stores the submission and events, and returns the freshly
 * computed result to render. Uses the service-role client, matching the
 * existing public lead-capture flow.
 */
import { buildResult, type Answers, type Contact, type FunnelSnapshot } from "./engine";

export type FunnelSubmitInput = {
  slug: string;
  answers: Answers;
  contact: Contact;
  sessionId?: string;
  meta?: { device?: string; referrer?: string; source?: string; durationMs?: number };
};

export async function handleFunnelSubmit(input: FunnelSubmitInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sb = supabaseAdmin as any;

  // 1. Load the published snapshot (anon visitors see exactly this).
  const { data, error } = await sb.rpc("rr_get_published_by_slug", { _slug: input.slug });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.snapshot) throw new Error("This funnel is not available.");
  const snapshot = row.snapshot as FunnelSnapshot;
  const calcId: string = row.calculator_id;
  const versionId: string | null = row.version_id ?? null;
  const version: number | null = row.version ?? null;

  const industry = typeof input.answers.industry === "string" ? input.answers.industry : null;

  // 2. Server-authoritative recompute.
  const result = buildResult(snapshot, input.answers, industry);

  // 3. Upsert the lead (one row per email) with funnel attributes.
  const c = input.contact;
  const email = c.email.trim().toLowerCase();
  const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || email;

  const funnelResult = {
    score: result.score.normalized,
    band: result.score.band.label,
    readiness: result.score.band.readiness ?? null,
    primary: result.primary,
    secondary: result.secondary,
    recommendedService: result.recommendedService,
    outputs: result.outputs,
    recommendations: result.recommendations.map((r) => ({
      title: r.title,
      reason: r.reason,
      cta: r.cta,
    })),
  };

  const funnelPatch: Record<string, unknown> = {
    source: "Funnel",
    funnel_id: calcId,
    funnel_name: snapshot.name,
    funnel_score: result.score.normalized,
    funnel_response_data: input.answers,
    funnel_result: funnelResult,
    funnel_version: version != null ? String(version) : null,
  };
  if (industry) funnelPatch.industry = industry;

  const { data: existing } = await sb
    .from("leads")
    .select("id, full_name, first_name, last_name, phone, business_name, website, job_title")
    .eq("email", email)
    .maybeSingle();

  let leadId: string;
  if (existing) {
    leadId = existing.id;
    const patch: Record<string, unknown> = { ...funnelPatch };
    if (!existing.full_name && fullName) patch.full_name = fullName;
    if (!existing.first_name && c.first_name) patch.first_name = c.first_name;
    if (!existing.last_name && c.last_name) patch.last_name = c.last_name;
    if (!existing.phone && c.phone) patch.phone = c.phone;
    if (!existing.business_name && c.company) patch.business_name = c.company;
    if (!existing.website && c.website) patch.website = c.website;
    if (!existing.job_title && c.job_title) patch.job_title = c.job_title;
    await sb.from("leads").update(patch).eq("id", leadId);
  } else {
    const { data: created, error: insErr } = await sb
      .from("leads")
      .insert({
        email,
        full_name: fullName,
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        phone: c.phone || null,
        business_name: c.company || null,
        website: c.website || null,
        job_title: c.job_title || null,
        platform: "Website",
        ...funnelPatch,
      })
      .select("id")
      .single();
    if (insErr || !created) throw new Error(insErr?.message ?? "Could not save your details.");
    leadId = created.id;
  }

  // 4. Store the submission.
  const { data: sub, error: subErr } = await sb
    .from("rr_submissions")
    .insert({
      calculator_id: calcId,
      version_id: versionId,
      slug: input.slug,
      industry,
      answers: input.answers,
      score: result.score.normalized,
      score_breakdown: result.score.byQuestion,
      financial_impact: { outputs: result.outputs },
      recommendations: result.recommendations,
      lead_id: leadId,
      contact: input.contact,
      device: input.meta?.device ?? null,
      traffic_source: input.meta?.source ?? null,
      referrer: input.meta?.referrer ?? null,
      session_id: input.sessionId ?? null,
      duration_ms: input.meta?.durationMs ?? null,
    })
    .select("id")
    .single();
  if (subErr) throw new Error(subErr.message);
  const submissionId: string = sub.id;

  // 5. Dashboard activity + funnel events (best-effort).
  await sb.from("lead_activity").insert({
    lead_id: leadId,
    kind: "calculator",
    calculator_slug: input.slug,
    submission_id: submissionId,
    full_name: fullName,
    email,
    phone: c.phone || null,
    platform: "Website",
    metadata: {
      funnel: snapshot.name,
      score: result.score.normalized,
      band: result.score.band.label,
    },
  });
  // payload is NOT NULL; include it on every row so a heterogeneous batch
  // never sends NULL (PostgREST fills missing keys with NULL, not DEFAULT).
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
      payload: { score: result.score.normalized, band: result.score.band.label },
    },
  ]);

  return { result, submissionId };
}
