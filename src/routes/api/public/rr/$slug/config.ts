import { createFileRoute } from "@tanstack/react-router";
import { createPublicClient } from "@/lib/revenue-recovery/supabase-public";
import { snapshotToConfig } from "@/lib/revenue-recovery/snapshot";

export const Route = createFileRoute("/api/public/rr/$slug/config")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const supabase = createPublicClient();
        const { data, error } = await supabase.rpc("rr_get_published_by_slug", { _slug: params.slug });
        if (error) return new Response(error.message, { status: 500 });
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return new Response("Not found", { status: 404 });
        const snap = row.snapshot as { calculator: any; questions: any[]; scoring: any[]; recommendations: any[] };
        const config = snapshotToConfig({
          calculator: snap.calculator,
          questions: snap.questions,
          scoring: snap.scoring,
          recommendations: snap.recommendations,
          version: row.version,
          publishedAt: row.published_at,
        });
        return Response.json({ config, calculatorId: row.calculator_id, versionId: row.version_id });
      },
    },
  },
});