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
