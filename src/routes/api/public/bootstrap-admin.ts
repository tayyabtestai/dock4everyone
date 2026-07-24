import { createFileRoute } from "@tanstack/react-router";
import { bootstrapAdmin } from "@/lib/bootstrap-admin.functions";

export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const result = await bootstrapAdmin({ data: body });
        return new Response(JSON.stringify(result), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});