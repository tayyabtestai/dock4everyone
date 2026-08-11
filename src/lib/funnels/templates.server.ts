/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Template installer. Turns a data-only FunnelTemplate into live rr_* rows via
 * the admin's session (RLS already permits admin writes). Idempotent: matched
 * by `key`, an existing funnel is updated and its questions/scoring/recs are
 * replaced. Optionally publishes immediately so the public URL works.
 */
import type { FunnelTemplate } from "./templates/index";
import { TEMPLATE_BY_KEY } from "./templates/index";
import { publishFunnel } from "./snapshot.server";

function questionRows(calcId: string, t: FunnelTemplate) {
  return t.questions.map((q, i) => ({
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
    required: q.required,
    options: q.options ?? [],
    // rr_questions has no `display` column, so persist the UI hint inside the
    // validation JSON; assembleSnapshot restores it onto the question.
    validation: { ...(q.validation ?? {}), ...(q.display ? { display: q.display } : {}) },
    conditions: q.conditions ?? [],
    weight: q.weight ?? 0,
    scoring: q.scoring ?? { mode: "none" },
  }));
}

export async function installTemplate(
  sb: any,
  key: string,
  opts: { publish?: boolean },
  userId: string,
) {
  const t = TEMPLATE_BY_KEY[key];
  if (!t) throw new Error(`Unknown template: ${key}`);

  const calcRow = {
    key: t.key,
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    outcome: t.outcome ?? "",
    industries: t.industries,
    settings: t.settings as unknown as Record<string, unknown>,
  };

  // Upsert the calculator by key.
  const { data: existing } = await sb
    .from("rr_calculators")
    .select("id")
    .eq("key", t.key)
    .maybeSingle();

  let calcId: string;
  if (existing?.id) {
    calcId = existing.id;
    const { error } = await sb.from("rr_calculators").update(calcRow).eq("id", calcId);
    if (error) throw new Error(error.message);
    // Replace child rows so a re-install reflects the latest template.
    await Promise.all([
      sb.from("rr_questions").delete().eq("calculator_id", calcId),
      sb.from("rr_scoring_rules").delete().eq("calculator_id", calcId),
      sb.from("rr_recommendations").delete().eq("calculator_id", calcId),
    ]);
  } else {
    const { data, error } = await sb
      .from("rr_calculators")
      .insert({ ...calcRow, status: "draft", created_by: userId })
      .select("id")
      .maybeSingle();
    if (error) {
      if (error.code === "23505") throw new Error("A funnel with this key or slug already exists.");
      throw new Error(error.message);
    }
    calcId = data!.id;
  }

  // Insert children.
  const qRows = questionRows(calcId, t);
  if (qRows.length) {
    const { error } = await sb.from("rr_questions").insert(qRows);
    if (error) throw new Error(error.message);
  }
  if (t.scoringRules.length) {
    const { error } = await sb.from("rr_scoring_rules").insert(
      t.scoringRules.map((r) => ({
        calculator_id: calcId,
        industry: r.industry ?? null,
        config: r.config as unknown as Record<string, unknown>,
      })),
    );
    if (error) throw new Error(error.message);
  }
  if (t.recommendations.length) {
    const { error } = await sb.from("rr_recommendations").insert(
      t.recommendations.map((r, i) => ({
        calculator_id: calcId,
        order_index: r.order_index ?? i,
        industry: r.industry ?? null,
        title: r.title,
        body: r.reason || r.body,
        triggers: r.triggers as unknown as Record<string, unknown>,
        cta: r.cta as unknown as Record<string, unknown>,
      })),
    );
    if (error) throw new Error(error.message);
  }

  let published: { version: number } | null = null;
  if (opts.publish) {
    published = await publishFunnel(sb, calcId, userId);
  }

  return { id: calcId, slug: t.slug, published };
}

/** Install every built-in template (used to seed a fresh project). */
export async function installAllTemplates(sb: any, opts: { publish?: boolean }, userId: string) {
  const results: { key: string; id: string }[] = [];
  for (const key of Object.keys(TEMPLATE_BY_KEY)) {
    const r = await installTemplate(sb, key, opts, userId);
    results.push({ key, id: r.id });
  }
  return { installed: results.length, results };
}
