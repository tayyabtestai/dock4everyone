import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { assertAdmin, supabaseForUser, text } from "../supabase";

export default defineTool({
  name: "create_signed_url",
  title: "Create signed file URL",
  description: "Return a short-lived signed URL for a resource's stored file (pdf/image/video).",
  inputSchema: {
    resource_id: z.string().uuid(),
    expires_in_seconds: z.number().int().min(60).max(3600).default(600),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ resource_id, expires_in_seconds }, ctx) => {
    const sb = await assertAdmin(ctx);
    const { data: r, error } = await sb.from("resources").select("file_path, resource_type").eq("id", resource_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!r?.file_path) throw new Error("Resource has no stored file");
    const { data: signed, error: sErr } = await supabaseForUser(ctx)
      .storage.from("resources")
      .createSignedUrl(r.file_path, expires_in_seconds);
    if (sErr || !signed?.signedUrl) throw new Error(sErr?.message ?? "Could not sign URL");
    return text({ url: signed.signedUrl, expires_in_seconds });
  },
});
