import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { assertAdmin, supabaseForUser, text } from "../supabase";

export default defineTool({
  name: "delete_resource",
  title: "Delete resource",
  description: "Delete a resource. Also removes its stored file, if any.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true },
  handler: async ({ id }, ctx) => {
    const sb = await assertAdmin(ctx);
    const { data: existing } = await sb.from("resources").select("file_path").eq("id", id).maybeSingle();
    if (existing?.file_path) {
      await supabaseForUser(ctx).storage.from("resources").remove([existing.file_path]);
    }
    const { error } = await sb.from("resources").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return text({ deleted: id });
  },
});
