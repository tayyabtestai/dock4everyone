import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { assertAdmin, text } from "../supabase";

export default defineTool({
  name: "list_resources",
  title: "List resources",
  description: "List Dock resources (published and drafts). Filter by status or category.",
  inputSchema: {
    status: z.enum(["draft", "published"]).optional().describe("Filter by status"),
    category: z.string().optional().describe("Filter by category"),
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ status, category, limit }, ctx) => {
    const sb = await assertAdmin(ctx);
    let q = sb.from("resources")
      .select("id, slug, title, description, category, resource_type, status, thumbnail_url, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return text({ resources: data });
  },
});
