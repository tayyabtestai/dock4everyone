import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { LeadFilterSchema } from "./filters";
import { BulkSchema, ImportSchema, LeadWriteSchema, ListLeadsSchema, SavedViewSchema } from "./schemas";

export const adminListLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListLeadsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.listLeads(context.supabase, data);
  });

export const adminExportLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ filters: LeadFilterSchema.default({}), ids: z.array(z.string().uuid()).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.exportRows(context.supabase, data.filters, data.ids);
  });

export const adminGetLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.getLead(context.supabase, data.id);
  });

export const adminLeadStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ from: z.string().nullable().optional(), to: z.string().nullable().optional() }).default({}).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.dashboardStats(context.supabase, data);
  });

export const adminCreateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LeadWriteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("leads").insert(m.toRecord(data) as never).select("id").maybeSingle();
    if (error) {
      if (error.code === "23505") throw new Error("A lead with this email already exists.");
      throw new Error(error.message);
    }
    return { id: row?.id as string };
  });

export const adminUpdateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), patch: LeadWriteSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("leads").update(m.toRecord(data.patch) as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("leads").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { deleted: data.ids.length };
  });

export const adminBulkUpdateLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BulkSchema.parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.bulkUpdate(context.supabase, data);
  });

export const adminImportLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ImportSchema.parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.importLeads(context.supabase, data, context.userId);
  });

export const adminPreviewImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(5000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.previewImport(context.supabase, data.rows);
  });

export const adminSavedViews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.listSavedViews(context.supabase);
  });

export const adminCreateSavedView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SavedViewSchema.parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.createSavedView(context.supabase, data, context.userId);
  });

export const adminDeleteSavedView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    return m.deleteSavedView(context.supabase, data.id);
  });

export const adminImportHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("lead_imports")
      .select("id, file_name, imported_count, skipped_count, duplicate_count, failed_count, total_rows, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminAllTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./admin.server");
    await m.assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("leads").select("tags").limit(5000);
    if (error) throw new Error(error.message);
    const set = new Set<string>();
    for (const r of (data ?? []) as { tags: string[] | null }[]) for (const t of r.tags ?? []) set.add(t);
    return [...set].sort();
  });
