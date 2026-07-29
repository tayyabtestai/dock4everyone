import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createPublicClient } from "@/lib/revenue-recovery/supabase-public";

const bodySchema = z.object({
  event: z.string().min(1).max(64),
  session_id: z.string().max(128).optional(),
  industry: z.string().max(64).optional(),
  device: z.string().max(32).optional(),
  source: z.string().max(128).optional(),
  referrer: z.string().max(2048).optional(),
  payload: z.record(z.string(), z.any()).default({}),
});

export const Route = createFileRoute("/api/public/rr/$slug/event")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        let raw: unknown;
        try { raw = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) return new Response("Invalid", { status: 400 });
        const supabase = createPublicClient();
        const { data: pub, error: rpcErr } = await supabase.rpc("rr_get_published_by_slug", { _slug: params.slug });
        if (rpcErr) return new Response(rpcErr.message, { status: 500 });
        const row = Array.isArray(pub) ? pub[0] : pub;
        if (!row) return new Response("Not published", { status: 404 });
        const { error } = await supabase.from("rr_events").insert({
          calculator_id: row.calculator_id,
          slug: params.slug,
          event: parsed.data.event,
          session_id: parsed.data.session_id ?? null,
          industry: parsed.data.industry ?? null,
          device: parsed.data.device ?? null,
          source: parsed.data.source ?? null,
          referrer: parsed.data.referrer ?? null,
          payload: parsed.data.payload,
        });
        if (error) return new Response(error.message, { status: 500 });
        return new Response("ok");
      },
    },
  },
});