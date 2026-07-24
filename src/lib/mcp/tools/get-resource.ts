import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { assertAdmin, text } from "../supabase";

export default defineTool({
  name: "get_resource",
  title: "Get resource",
  description: "Fetch one resource by id or slug, including file_path and external_url.",
  inputSchema: {
    id: z.string().uuid().optional(),
    slug: z.string().optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ id, slug }, ctx) => {
    if (!id && !slug) throw new Error("Provide id or slug");
    const sb = await assertAdmin(ctx);
    const q = sb.from("resources").select("*").limit(1);
    const { data, error } = id ? await q.eq("id", id).maybeSingle() : await q.eq("slug", slug!).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Resource not found");
    return text(data);
  },
});
