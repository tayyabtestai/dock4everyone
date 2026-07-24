import { defineTool } from "@lovable.dev/mcp-js";
import { assertAdmin, text } from "../supabase";

export default defineTool({
  name: "dashboard_stats",
  title: "Dashboard stats",
  description: "Totals for resources and leads, plus leads captured today.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const sb = await assertAdmin(ctx);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [resTotal, resPub, leadTotal, leadToday] = await Promise.all([
      sb.from("resources").select("id", { count: "exact", head: true }),
      sb.from("resources").select("id", { count: "exact", head: true }).eq("status", "published"),
      sb.from("leads").select("id", { count: "exact", head: true }),
      sb.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startOfDay.toISOString()),
    ]);
    return text({
      resources_total: resTotal.count ?? 0,
      resources_published: resPub.count ?? 0,
      leads_total: leadTotal.count ?? 0,
      leads_today: leadToday.count ?? 0,
    });
  },
});
