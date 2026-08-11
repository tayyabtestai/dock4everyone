import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ListSchema = z.object({
  tab: z.enum(["all", "published", "draft", "archived"]).default("all"),
  search: z.string().optional(),
  industry: z.string().optional(),
  sort: z
    .enum(["newest", "oldest", "views", "submissions", "conversion", "name"])
    .default("newest"),
});

const CreateSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  description: z.string().optional(),
  industries: z.array(z.string()).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
  slug: z.string().optional(),
});

export const adminListFunnels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.listFunnels(context.supabase, data);
  });

export const adminFunnelKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.funnelKpis(context.supabase);
  });

export const adminGetFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.getFunnelDetail(context.supabase, data.id);
  });

export const adminCreateFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.createFunnel(context.supabase, data, context.userId);
  });

export const adminSetFunnelStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["draft", "published", "archived"]) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.setFunnelStatus(context.supabase, data.id, data.status);
  });

export const adminDuplicateFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.duplicateFunnel(context.supabase, data.id, context.userId);
  });

export const adminDeleteFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.deleteFunnel(context.supabase, data.id);
  });

export const adminInstallTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ key: z.string().min(1), publish: z.boolean().default(true) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const [t, a] = await Promise.all([import("./templates.server"), import("./admin.server")]);
    await a.assertAdmin(context.supabase, context.userId);
    return t.installTemplate(context.supabase, data.key, { publish: data.publish }, context.userId);
  });

export const adminInstallAllTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ publish: z.boolean().default(false) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const [t, a] = await Promise.all([import("./templates.server"), import("./admin.server")]);
    await a.assertAdmin(context.supabase, context.userId);
    return t.installAllTemplates(context.supabase, { publish: data.publish }, context.userId);
  });

export const adminPublishFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [s, a] = await Promise.all([import("./snapshot.server"), import("./admin.server")]);
    await a.assertAdmin(context.supabase, context.userId);
    return s.publishFunnel(context.supabase, data.id, context.userId);
  });

export const adminGetFunnelForEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [b, a] = await Promise.all([import("./builder.server"), import("./admin.server")]);
    await a.assertAdmin(context.supabase, context.userId);
    return b.getFunnelForEdit(context.supabase, data.id);
  });

// Questions/settings are validated by the engine on publish; here we accept the
// editable structure permissively (admin-only) and let the DB enforce types.
const SaveSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  description: z.string().max(2000).default(""),
  tagline: z.string().max(300).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug may contain lowercase letters, numbers and hyphens only"),
  industries: z.array(z.string().max(120)).max(30).default([]),
  settings: z.record(z.string(), z.unknown()).default({}),
  questions: z.array(z.record(z.string(), z.unknown())).max(200).default([]),
});

export const adminSaveFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const [b, a] = await Promise.all([import("./builder.server"), import("./admin.server")]);
    await a.assertAdmin(context.supabase, context.userId);
    const { id, ...payload } = data;
    return b.saveFunnel(context.supabase, id, payload as Parameters<typeof b.saveFunnel>[2]);
  });
