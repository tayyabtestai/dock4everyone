import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden");
}

// -------- listing / reading --------
export const listCalculators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("rr_calculators")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { calculators: data ?? [] };
  });

export const getCalculator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid().optional(), key: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.id && !data.key) throw new Error("id or key required");
    let q = context.supabase.from("rr_calculators").select("*").limit(1);
    if (data.id) q = q.eq("id", data.id);
    if (data.key) q = q.eq("key", data.key);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const calc = rows?.[0];
    if (!calc) throw new Error("Not found");
    const [questionsRes, scoringRes, recsRes, versionsRes] = await Promise.all([
      context.supabase.from("rr_questions").select("*").eq("calculator_id", calc.id).order("order_index"),
      context.supabase.from("rr_scoring_rules").select("*").eq("calculator_id", calc.id),
      context.supabase.from("rr_recommendations").select("*").eq("calculator_id", calc.id).order("order_index"),
      context.supabase.from("rr_calculator_versions").select("id, version, is_published, created_at").eq("calculator_id", calc.id).order("version", { ascending: false }),
    ]);
    return {
      calculator: calc,
      questions: questionsRes.data ?? [],
      scoring: scoringRes.data ?? [],
      recommendations: recsRes.data ?? [],
      versions: versionsRes.data ?? [],
    };
  });

// -------- writes --------
const calculatorInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase, digits, hyphens"),
  key: z.string().min(1),
  tagline: z.string().default(""),
  description: z.string().default(""),
  outcome: z.string().default(""),
  industries: z.array(z.string()).default([]),
  settings: z.record(z.string(), z.any()).default({}),
});

export const createCalculator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => calculatorInput.omit({ id: true }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("rr_calculators")
      .insert({ ...data, created_by: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCalculator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => calculatorInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("rr_calculators").update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const duplicateCalculator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: orig, error } = await context.supabase
      .from("rr_calculators").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const suffix = "-copy-" + Math.random().toString(36).slice(2, 6);
    const { data: copy, error: err2 } = await context.supabase
      .from("rr_calculators")
      .insert({
        key: orig.key + suffix,
        slug: orig.slug + suffix,
        name: orig.name + " (Copy)",
        tagline: orig.tagline,
        description: orig.description,
        outcome: orig.outcome,
        industries: orig.industries,
        settings: orig.settings,
        status: "draft",
        created_by: context.userId,
      }).select("*").single();
    if (err2) throw new Error(err2.message);

    const [{ data: qs }, { data: sr }, { data: rc }] = await Promise.all([
      context.supabase.from("rr_questions").select("*").eq("calculator_id", data.id),
      context.supabase.from("rr_scoring_rules").select("*").eq("calculator_id", data.id),
      context.supabase.from("rr_recommendations").select("*").eq("calculator_id", data.id),
    ]);
    if (qs?.length) await context.supabase.from("rr_questions").insert(qs.map((q: any) => ({ ...q, id: undefined, calculator_id: copy.id })));
    if (sr?.length) await context.supabase.from("rr_scoring_rules").insert(sr.map((r: any) => ({ ...r, id: undefined, calculator_id: copy.id })));
    if (rc?.length) await context.supabase.from("rr_recommendations").insert(rc.map((r: any) => ({ ...r, id: undefined, calculator_id: copy.id })));
    return copy;
  });

export const archiveCalculator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("rr_calculators")
      .update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCalculator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("rr_calculators").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- publish / versions --------
export const publishCalculator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [{ data: calc }, { data: questions }, { data: scoring }, { data: recs }, { data: lastVer }] = await Promise.all([
      context.supabase.from("rr_calculators").select("*").eq("id", data.id).single(),
      context.supabase.from("rr_questions").select("*").eq("calculator_id", data.id).order("order_index"),
      context.supabase.from("rr_scoring_rules").select("*").eq("calculator_id", data.id),
      context.supabase.from("rr_recommendations").select("*").eq("calculator_id", data.id).order("order_index"),
      context.supabase.from("rr_calculator_versions").select("version").eq("calculator_id", data.id).order("version", { ascending: false }).limit(1),
    ]);
    if (!calc) throw new Error("Not found");
    const nextVersion = ((lastVer?.[0]?.version as number | undefined) ?? 0) + 1;
    const snapshot = {
      calculator: calc,
      questions: questions ?? [],
      scoring: scoring ?? [],
      recommendations: recs ?? [],
    };
    const { data: ver, error } = await context.supabase.from("rr_calculator_versions")
      .insert({ calculator_id: data.id, version: nextVersion, snapshot, is_published: true, created_by: context.userId })
      .select("*").single();
    if (error) throw new Error(error.message);
    // Flip published flag on previous versions
    await context.supabase.from("rr_calculator_versions")
      .update({ is_published: false }).eq("calculator_id", data.id).neq("id", ver.id);
    // Update calculator
    const { error: err2 } = await context.supabase.from("rr_calculators").update({
      status: "published",
      published_version: nextVersion,
      published_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (err2) throw new Error(err2.message);
    return { version: nextVersion };
  });

export const unpublishCalculator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("rr_calculators")
      .update({ status: "draft" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- questions --------
const questionInput = z.object({
  id: z.string().uuid().optional(),
  calculator_id: z.string().uuid(),
  order_index: z.number().int().default(0),
  section: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  type: z.enum(["single_choice","multi_choice","number","currency","percentage","slider","rating","yes_no","short_text","long_text"]),
  key: z.string().min(1),
  label: z.string().default(""),
  help: z.string().default(""),
  tooltip: z.string().default(""),
  insight: z.string().default(""),
  required: z.boolean().default(false),
  options: z.array(z.any()).default([]),
  validation: z.record(z.string(), z.any()).default({}),
  conditions: z.array(z.any()).default([]),
  weight: z.number().default(0),
  scoring: z.record(z.string(), z.any()).default({}),
});

export const upsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => questionInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from("rr_questions").upsert(data).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("rr_questions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orders: z.array(z.object({ id: z.string().uuid(), order_index: z.number().int() })) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await Promise.all(data.orders.map((o) =>
      context.supabase.from("rr_questions").update({ order_index: o.order_index }).eq("id", o.id)
    ));
    return { ok: true };
  });

// -------- scoring rules --------
export const upsertScoringRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid().optional(),
    calculator_id: z.string().uuid(),
    industry: z.string().nullable().optional(),
    config: z.record(z.string(), z.any()).default({}),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from("rr_scoring_rules")
      .upsert(data, { onConflict: "calculator_id,industry" }).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

// -------- recommendations --------
const recInput = z.object({
  id: z.string().uuid().optional(),
  calculator_id: z.string().uuid(),
  order_index: z.number().int().default(0),
  industry: z.string().nullable().optional(),
  title: z.string().default(""),
  body: z.string().default(""),
  triggers: z.record(z.string(), z.any()).default({}),
  cta: z.record(z.string(), z.any()).default({}),
});

export const upsertRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => recInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from("rr_recommendations")
      .upsert(data).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("rr_recommendations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- analytics --------
export const getCalculatorAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ calculator_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [{ data: events }, { data: submissions }] = await Promise.all([
      context.supabase.from("rr_events").select("event, industry, device, source, created_at").eq("calculator_id", data.calculator_id),
      context.supabase.from("rr_submissions").select("id, industry, device, traffic_source, duration_ms, completed_at").eq("calculator_id", data.calculator_id),
    ]);
    const buckets = { view: 0, start: 0, complete: 0, report_viewed: 0, pdf_downloaded: 0, cta_clicked: 0, call_booked: 0 } as Record<string, number>;
    for (const e of events ?? []) buckets[e.event as string] = (buckets[e.event as string] ?? 0) + 1;
    const completions = submissions?.length ?? 0;
    const avgMs = completions ? (submissions ?? []).reduce((a: number, s: any) => a + (s.duration_ms ?? 0), 0) / completions : 0;
    return {
      events: buckets,
      completions,
      averageCompletionMs: avgMs,
      completionRate: buckets.view ? completions / buckets.view : 0,
      submissions: submissions ?? [],
    };
  });

export const listSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ calculator_id: z.string().uuid(), limit: z.number().int().max(200).default(50) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase.from("rr_submissions")
      .select("*").eq("calculator_id", data.calculator_id)
      .order("completed_at", { ascending: false }).limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });