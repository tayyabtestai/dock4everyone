import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { assertAdmin, text } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "List leads",
  description: "List captured leads. Filter by resource, platform, and date range.",
  inputSchema: {
    resource_id: z.string().uuid().optional(),
    platform: z.string().optional(),
    since: z.string().datetime().optional().describe("ISO8601 lower bound on created_at"),
    limit: z.number().int().min(1).max(500).default(100),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ resource_id, platform, since, limit }, ctx) => {
    const sb = await assertAdmin(ctx);
    let q = sb.from("leads")
      .select("id, resource_id, full_name, email, phone, platform, browser, device, ip_address, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (resource_id) q = q.eq("resource_id", resource_id);
    if (platform) q = q.eq("platform", platform);
    if (since) q = q.gte("created_at", since);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return text({ leads: data });
  },
});
