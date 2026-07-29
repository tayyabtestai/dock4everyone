import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createPublicClient } from "@/lib/revenue-recovery/supabase-public";
import { snapshotToConfig } from "@/lib/revenue-recovery/snapshot";
import { validateAll } from "@/lib/revenue-recovery/engine/validation";
import { buildReport } from "@/lib/revenue-recovery/engine/report";
import { visibleQuestions } from "@/lib/revenue-recovery/engine/branching";

const submitSchema = z.object({
  answers: z.record(z.string(), z.any()).default({}),
  industry: z.string().max(64).optional(),
  contact: z.object({
    name: z.string().max(200).optional(),
    email: z.string().email().max(320),
    phone: z.string().max(64).optional(),
    company: z.string().max(200).optional(),
    website: z.string().max(500).optional(),
  }),
  session_id: z.string().max(128).optional(),
  device: z.string().max(32).optional(),
  traffic_source: z.string().max(128).optional(),
  referrer: z.string().max(2048).optional(),
  duration_ms: z.number().int().nonnegative().optional(),
});

export const Route = createFileRoute("/api/public/rr/$slug/submit")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        let raw: unknown;
        try { raw = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
        const parsed = submitSchema.safeParse(raw);
        if (!parsed.success) return Response.json({ error: parsed.error.format() }, { status: 400 });
        const supabase = createPublicClient();
        const { data: pub, error: rpcErr } = await supabase.rpc("rr_get_published_by_slug", { _slug: params.slug });
        if (rpcErr) return new Response(rpcErr.message, { status: 500 });
        const row = Array.isArray(pub) ? pub[0] : pub;
        if (!row) return new Response("Not published", { status: 404 });
        const snap = row.snapshot as { calculator: any; questions: any[]; scoring: any[]; recommendations: any[] };
        const config = snapshotToConfig({
          calculator: snap.calculator, questions: snap.questions,
          scoring: snap.scoring, recommendations: snap.recommendations,
          version: row.version, publishedAt: row.published_at,
        });
        const visible = visibleQuestions(config.questions, parsed.data.answers, parsed.data.industry ?? null);
        const errors = validateAll(visible, parsed.data.answers);
        if (errors.length) return Response.json({ error: "validation", errors }, { status: 400 });

        const report = buildReport(config, parsed.data.answers, parsed.data.industry ?? null);

        const { data: leadRow, error: leadErr } = await supabase.from("leads").insert({
          full_name: parsed.data.contact.name ?? parsed.data.contact.email,
          email: parsed.data.contact.email,
          phone: parsed.data.contact.phone ?? null,
          platform: `rr:${params.slug}`,
        }).select("id").single();
        if (leadErr) console.error("[rr submit] lead insert failed", leadErr.message);

        const { data: submission, error: subErr } = await supabase.from("rr_submissions").insert({
          calculator_id: row.calculator_id,
          version_id: row.version_id,
          slug: params.slug,
          industry: parsed.data.industry ?? null,
          answers: parsed.data.answers as unknown as any,
          score: report.scoreValue,
          score_breakdown: report.breakdown as unknown as any,
          financial_impact: report.financialImpact as unknown as any,
          recommendations: report.recommendations as unknown as any,
          contact: parsed.data.contact as unknown as any,
          lead_id: leadRow?.id ?? null,
          device: parsed.data.device ?? null,
          traffic_source: parsed.data.traffic_source ?? null,
          referrer: parsed.data.referrer ?? null,
          session_id: parsed.data.session_id ?? null,
          duration_ms: parsed.data.duration_ms ?? null,
        }).select("id").single();
        if (subErr) return new Response(subErr.message, { status: 500 });

        return Response.json({ submissionId: submission.id, report });
      },
    },
  },
});