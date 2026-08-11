/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Snapshot + publish. The public funnel is served to anonymous visitors ONLY
 * through the `rr_get_published_by_slug` RPC, which returns a version snapshot
 * (rr_questions itself is admin-only). Publishing therefore assembles the live
 * funnel rows into a self-contained `FunnelSnapshot` and stores it as a new
 * rr_calculator_versions row, then points the calculator at that version.
 */
import type {
  EngineQuestion,
  EngineRecommendation,
  FunnelSettings,
  FunnelSnapshot,
} from "./engine";

/** Map DB rows (rr_*) into the engine's self-contained snapshot shape. */
export async function assembleSnapshot(sb: any, calcId: string): Promise<FunnelSnapshot> {
  const [calcRes, qRes, sRes, rRes] = await Promise.all([
    sb
      .from("rr_calculators")
      .select("id, key, slug, name, tagline, description, industries, settings")
      .eq("id", calcId)
      .maybeSingle(),
    sb
      .from("rr_questions")
      .select(
        "id, order_index, section, industry, type, key, label, help, insight, required, options, validation, conditions, weight, scoring",
      )
      .eq("calculator_id", calcId)
      .order("order_index", { ascending: true }),
    sb.from("rr_scoring_rules").select("industry, config").eq("calculator_id", calcId),
    sb
      .from("rr_recommendations")
      .select("id, order_index, industry, title, body, triggers, cta")
      .eq("calculator_id", calcId)
      .order("order_index", { ascending: true }),
  ]);
  if (calcRes.error) throw new Error(calcRes.error.message);
  if (!calcRes.data) throw new Error("Funnel not found.");
  if (qRes.error) throw new Error(qRes.error.message);

  const calc = calcRes.data;
  const questions: EngineQuestion[] = ((qRes.data ?? []) as any[]).map((q) => ({
    id: q.id,
    key: q.key,
    type: q.type,
    label: q.label ?? "",
    help: q.help || undefined,
    insight: q.insight || undefined,
    section: q.section || undefined,
    required: !!q.required,
    industry: q.industry ?? null,
    options: Array.isArray(q.options) ? q.options : [],
    conditions: q.conditions ?? [],
    weight: Number(q.weight ?? 0),
    scoring: q.scoring && Object.keys(q.scoring).length ? q.scoring : { mode: "none" },
    validation: q.validation && Object.keys(q.validation).length ? q.validation : undefined,
  }));

  const scoringRules = ((sRes.data ?? []) as any[]).map((r) => ({
    industry: r.industry ?? null,
    config: r.config ?? {},
  }));

  const recommendations: EngineRecommendation[] = ((rRes.data ?? []) as any[]).map((r) => ({
    id: r.id,
    order_index: r.order_index ?? 0,
    industry: r.industry ?? null,
    title: r.title ?? "",
    body: r.body ?? "",
    reason: r.body ?? "",
    triggers: r.triggers ?? [],
    cta: r.cta ?? {},
  }));

  return {
    id: calc.id,
    key: calc.key,
    slug: calc.slug,
    name: calc.name,
    tagline: calc.tagline ?? "",
    description: calc.description ?? "",
    industries: calc.industries ?? [],
    settings: (calc.settings ?? {}) as FunnelSettings,
    questions,
    scoringRules,
    recommendations,
  };
}

/**
 * Validate a funnel is publishable, snapshot it, and mark it published. Returns
 * the new version number. Mirrors the spec's publish validation.
 */
export async function publishFunnel(sb: any, calcId: string, userId: string) {
  const snapshot = await assembleSnapshot(sb, calcId);

  const errors: string[] = [];
  if (!snapshot.name?.trim()) errors.push("Funnel name is required.");
  if (!snapshot.slug?.trim()) errors.push("Slug is required.");
  if (!snapshot.questions.length) errors.push("Add at least one question.");
  for (const q of snapshot.questions) {
    if ((q.type === "single_choice" || q.type === "multi_choice") && q.options.length === 0) {
      errors.push(`Question "${q.label || q.key}" needs at least one option.`);
    }
  }
  if (errors.length) {
    const err = new Error(errors.join(" ")) as Error & { validation?: string[] };
    err.validation = errors;
    throw err;
  }

  // Next version number.
  const { data: last } = await sb
    .from("rr_calculator_versions")
    .select("version")
    .eq("calculator_id", calcId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = ((last?.version as number) ?? 0) + 1;

  const { data: ver, error: verErr } = await sb
    .from("rr_calculator_versions")
    .insert({
      calculator_id: calcId,
      version,
      snapshot: snapshot as unknown as Record<string, unknown>,
      is_published: true,
      created_by: userId,
    })
    .select("id")
    .maybeSingle();
  if (verErr) throw new Error(verErr.message);

  const { error: updErr } = await sb
    .from("rr_calculators")
    .update({
      status: "published",
      published_version: version,
      published_at: new Date().toISOString(),
    })
    .eq("id", calcId);
  if (updErr) throw new Error(updErr.message);

  return { version, versionId: ver?.id as string };
}
