import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { evaluateFormulas, applyRecommendations } from "@/lib/assessment-engine/evaluator";
import type { Formula, Question, RecommendationRule, ResultConfig, LeadFields } from "@/lib/assessment-engine/types";

// --------- validation ---------
const SlugSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, or hyphens");

const AssessmentUpsert = z.object({
  id: z.string().uuid().optional(),
  slug: SlugSchema,
  name: z.string().trim().min(1).max(200),
  industry: z.string().max(120).default(""),
  status: z.enum(["draft", "published", "archived"]),
  headline: z.string().max(500).default(""),
  subheadline: z.string().max(500).default(""),
  description: z.string().max(4000).default(""),
  estimated_minutes: z.number().int().min(0).max(120).default(3),
  primary_cta_label: z.string().max(80).default(""),
  primary_cta_url: z.string().max(500).default(""),
  secondary_cta_label: z.string().max(80).default(""),
  secondary_cta_url: z.string().max(500).default(""),
  seo_title: z.string().max(200).default(""),
  seo_description: z.string().max(400).default(""),
  featured_image_url: z.string().max(1000).default(""),
  og_image_url: z.string().max(1000).default(""),
  questions: z.array(z.any()).default([]),
  formulas: z.array(z.any()).default([]),
  result_config: z.record(z.string(), z.any()).default({}),
  lead_fields: z.record(z.string(), z.any()).default({}),
  ai_recommendations: z.array(z.any()).default([]),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

// --------- admin: list / get / upsert / delete ---------
export const listAssessments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("assessments")
      .select("id, slug, name, industry, status, featured_image_url, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAssessment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("assessments").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row;
  });

export const upsertAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AssessmentUpsert.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...payload } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("assessments").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin.from("assessments").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const duplicateAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: src, error } = await supabaseAdmin.from("assessments").select("*").eq("id", data.id).maybeSingle();
    if (error || !src) throw new Error("Not found");
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = src as any;
    rest.name = `${rest.name} (copy)`;
    rest.slug = `${rest.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
    rest.status = "draft";
    const { data: row, error: iErr } = await supabaseAdmin.from("assessments").insert(rest).select("id").single();
    if (iErr) throw new Error(iErr.message);
    return { id: row.id };
  });

export const deleteAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("assessments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --------- templates ---------
export const listTemplates = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("assessment_templates").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const createFromTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ template_id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let payload: any = {
      slug: `assessment-${Math.random().toString(36).slice(2, 8)}`,
      name: "Untitled Assessment",
      status: "draft" as const,
    };
    if (data.template_id) {
      const { data: t } = await supabaseAdmin.from("assessment_templates").select("*").eq("id", data.template_id).maybeSingle();
      if (t) {
        payload = {
          ...payload,
          name: t.name,
          industry: t.industry ?? "",
          questions: t.questions ?? [],
          formulas: t.formulas ?? [],
          result_config: t.result_config ?? {},
          ai_recommendations: t.ai_recommendations ?? [],
        };
      }
    }
    const { data: row, error } = await supabaseAdmin.from("assessments").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// --------- public: get by slug ---------
export const getPublicAssessment = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("assessments")
      .select("id, slug, name, industry, headline, subheadline, description, estimated_minutes, primary_cta_label, primary_cta_url, secondary_cta_label, secondary_cta_url, seo_title, seo_description, featured_image_url, og_image_url, questions, formulas, result_config, lead_fields, ai_recommendations, status")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row;
  });

// --------- public: submit ---------
const SubmitInput = z.object({
  slug: z.string().min(1).max(120),
  answers: z.record(z.string(), z.any()).default({}),
  lead: z.object({
    full_name: z.string().trim().max(120).optional().default(""),
    email: z.string().trim().email().max(255).optional().or(z.literal("")).default(""),
    phone: z.string().trim().max(40).optional().default(""),
    company: z.string().trim().max(120).optional().default(""),
    industry: z.string().trim().max(120).optional().default(""),
    job_title: z.string().trim().max(120).optional().default(""),
    team_size: z.string().trim().max(60).optional().default(""),
    country: z.string().trim().max(80).optional().default(""),
    consent: z.boolean().optional().default(false),
  }).default({}),
  utm: z.record(z.string(), z.string()).default({}),
  landing_page: z.string().max(1000).optional().default(""),
  duration_seconds: z.number().int().min(0).max(60 * 60 * 4).optional().default(0),
});

function parseUA(ua: string) {
  const s = ua.toLowerCase();
  let browser = "Unknown";
  if (s.includes("edg/")) browser = "Edge";
  else if (s.includes("chrome/") && !s.includes("chromium")) browser = "Chrome";
  else if (s.includes("firefox/")) browser = "Firefox";
  else if (s.includes("safari/") && !s.includes("chrome")) browser = "Safari";
  let device = "Desktop";
  if (/mobile|iphone|android/i.test(ua)) device = "Mobile";
  else if (/ipad|tablet/i.test(ua)) device = "Tablet";
  return { browser, device };
}

export const submitAssessment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: a, error } = await supabaseAdmin
      .from("assessments").select("*").eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (error || !a) throw new Error("Assessment not available");

    const computed = evaluateFormulas(a.formulas as Formula[], data.answers);
    const recs = applyRecommendations(a.ai_recommendations as RecommendationRule[], computed);

    let ip: string | null = null; let ua = "";
    try {
      const req = getRequest();
      ua = req.headers.get("user-agent") ?? "";
      ip = req.headers.get("cf-connecting-ip")
        ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? req.headers.get("x-real-ip") ?? null;
    } catch {}
    const { browser, device } = parseUA(ua);

    // Optional lead capture — reuse existing leads table when email present.
    let lead_id: string | null = null;
    if (data.lead?.email && data.lead?.full_name) {
      const { data: lead } = await supabaseAdmin.from("leads").insert({
        resource_id: null as any, // leads.resource_id is nullable now unused; if not, skip
        full_name: data.lead.full_name,
        email: data.lead.email.toLowerCase(),
        phone: data.lead.phone || null,
        platform: "Website",
        ip_address: ip,
        user_agent: ua || null,
        browser, device,
      } as any).select("id").single();
      lead_id = lead?.id ?? null;
    }

    const { data: sub, error: sErr } = await supabaseAdmin.from("assessment_submissions").insert({
      assessment_id: a.id,
      lead_id,
      answers: data.answers,
      computed,
      score: (computed as any)[(a.result_config as ResultConfig)?.valueVar ?? ""] ?? null,
      recommendations: recs,
      utm: data.utm,
      landing_page: data.landing_page || null,
      referrer: null,
      country: null,
      device, browser,
      ip_address: ip, user_agent: ua || null,
      duration_seconds: data.duration_seconds,
      completed: true,
    }).select("id").single();
    if (sErr) throw new Error(sErr.message);

    return {
      submission_id: sub.id,
      computed,
      recommendations: recs,
      result_config: a.result_config as ResultConfig,
      formulas: a.formulas as Formula[],
    };
  });

// --------- public: track event ---------
export const trackAssessmentEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slug: z.string().min(1).max(120),
    type: z.enum(["view", "start", "step", "complete", "drop"]),
    step_index: z.number().int().min(0).max(500).optional(),
    session_id: z.string().min(1).max(80),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: a } = await supabaseAdmin.from("assessments").select("id").eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (!a) return { ok: false };
    await supabaseAdmin.from("assessment_events").insert({
      assessment_id: a.id, type: data.type, step_index: data.step_index ?? null, session_id: data.session_id,
    });
    return { ok: true };
  });

// --------- analytics ---------
export const assessmentAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: events }, { data: subs }] = await Promise.all([
      supabaseAdmin.from("assessment_events").select("type, step_index, created_at").eq("assessment_id", data.id),
      supabaseAdmin.from("assessment_submissions").select("id, score, duration_seconds, device, country, created_at, lead_id").eq("assessment_id", data.id).order("created_at", { ascending: false }).limit(50),
    ]);
    const evs = events ?? [];
    const views = evs.filter((e) => e.type === "view").length;
    const starts = evs.filter((e) => e.type === "start").length;
    const completes = (subs ?? []).length;
    const durations = (subs ?? []).map((s) => s.duration_seconds ?? 0).filter((d) => d > 0);
    const scores = (subs ?? []).map((s) => s.score).filter((v): v is number => typeof v === "number");
    return {
      views, starts, completes,
      completion_rate: starts > 0 ? completes / starts : 0,
      avg_duration_seconds: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      avg_score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      recent: subs ?? [],
    };
  });