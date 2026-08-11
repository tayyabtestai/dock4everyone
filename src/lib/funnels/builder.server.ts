/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Builder read/save. Loads a funnel's live rows for editing and writes edits
 * back. Questions are replaced wholesale on save; recommendations, scoring rules
 * and calculation config are left intact (not edited in the builder MVP), so
 * publishing still captures them. Reuses assembleSnapshot for the read mapping.
 */
import { assembleSnapshot } from "./snapshot.server";
import type { EngineQuestion } from "./engine";

export async function getFunnelForEdit(sb: any, id: string) {
  const snapshot = await assembleSnapshot(sb, id);
  const { data: meta, error } = await sb
    .from("rr_calculators")
    .select("status, outcome, published_version, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    id: snapshot.id,
    key: snapshot.key,
    slug: snapshot.slug,
    name: snapshot.name,
    tagline: snapshot.tagline,
    description: snapshot.description,
    industries: snapshot.industries,
    settings: snapshot.settings,
    questions: snapshot.questions,
    scoringRules: snapshot.scoringRules,
    recommendations: snapshot.recommendations,
    status: meta?.status ?? "draft",
    publishedVersion: meta?.published_version ?? null,
  };
}

function questionRow(calcId: string, q: EngineQuestion, i: number) {
  const validation = {
    ...(q.validation ?? {}),
    ...(q.display ? { display: q.display } : {}),
  };
  return {
    calculator_id: calcId,
    order_index: i,
    section: q.section ?? null,
    industry: q.industry ?? null,
    type: q.type,
    key: q.key,
    label: q.label,
    help: q.help ?? "",
    tooltip: "",
    insight: q.insight ?? "",
    required: !!q.required,
    options: q.options ?? [],
    validation,
    conditions: q.conditions ?? [],
    weight: q.weight ?? 0,
    scoring: q.scoring ?? { mode: "none" },
  };
}

export type SaveFunnelPayload = {
  name: string;
  description: string;
  tagline?: string;
  slug: string;
  industries: string[];
  settings: Record<string, unknown>;
  questions: EngineQuestion[];
};

export async function saveFunnel(sb: any, id: string, payload: SaveFunnelPayload) {
  // Guard slug uniqueness against OTHER funnels.
  const { data: clash } = await sb
    .from("rr_calculators")
    .select("id")
    .eq("slug", payload.slug)
    .neq("id", id)
    .maybeSingle();
  if (clash) throw new Error("That slug is already used by another funnel.");

  const { error: updErr } = await sb
    .from("rr_calculators")
    .update({
      name: payload.name.trim(),
      description: payload.description,
      tagline: payload.tagline ?? "",
      slug: payload.slug,
      industries: payload.industries,
      settings: payload.settings,
    })
    .eq("id", id);
  if (updErr) throw new Error(updErr.message);

  // Replace questions.
  await sb.from("rr_questions").delete().eq("calculator_id", id);
  const rows = payload.questions.map((q, i) => questionRow(id, q, i));
  if (rows.length) {
    const { error } = await sb.from("rr_questions").insert(rows);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}
