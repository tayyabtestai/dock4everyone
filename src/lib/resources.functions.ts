import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ResourceTypeEnum = z.enum(["pdf", "image", "video", "github", "drive", "website"]);
const StatusEnum = z.enum(["draft", "published"]);

const ResourceInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, or hyphens"),
  description: z.string().max(2000).default(""),
  category: z.string().trim().min(1).max(80),
  thumbnail_url: z.string().url().optional().or(z.literal("")).optional(),
  resource_type: ResourceTypeEnum,
  button_text: z.string().trim().min(1).max(60).default("Get Resource"),
  status: StatusEnum,
  file_path: z.string().max(500).optional().or(z.literal("")),
  external_url: z.string().url().max(1000).optional().or(z.literal("")),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export const upsertResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResourceInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      title: data.title,
      slug: data.slug,
      description: data.description,
      category: data.category,
      thumbnail_url: data.thumbnail_url || null,
      resource_type: data.resource_type,
      button_text: data.button_text,
      status: data.status,
      file_path: data.file_path || null,
      external_url: data.external_url || null,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("resources").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    } else {
      const { data: row, error } = await supabaseAdmin.from("resources").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
  });

export const deleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // best-effort file cleanup
    const { data: r } = await supabaseAdmin.from("resources").select("file_path").eq("id", data.id).maybeSingle();
    if (r?.file_path) await supabaseAdmin.storage.from("resources").remove([r.file_path]);
    const { error } = await supabaseAdmin.from("resources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
