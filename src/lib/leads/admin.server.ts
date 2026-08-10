/* eslint-disable @typescript-eslint/no-explicit-any */
import { applyLeadFilters, type LeadFilters } from "./filters";
import { normaliseWebsite } from "./taxonomy";
import { NUMERIC_FIELDS, WRITABLE_KEYS } from "./fields";
import type { ImportSummary, LeadWrite } from "./schemas";

const COLS = "*";

export type LeadRow = Record<string, any> & {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
};

export async function assertAdmin(sb: any, userId: string) {
  const { data, error } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

function composeName(input: Partial<LeadWrite>): string {
  const joined = [input.first_name, input.last_name].filter(Boolean).join(" ").trim();
  return (input.full_name?.trim() || joined || input.email || "").trim();
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Maps validated form input onto a leads table record. */
export function toRecord(input: LeadWrite): Record<string, any> {
  const rec: Record<string, any> = {};
  for (const key of WRITABLE_KEYS) {
    if (!(key in input)) continue;
    const v = (input as Record<string, any>)[key];
    if (NUMERIC_FIELDS.has(key)) rec[key] = toNumber(v);
    else if (key === "tags") rec[key] = Array.isArray(v) ? v : [];
    else rec[key] = v === "" || v === undefined ? null : v;
  }
  rec['email'] = input.email.trim().toLowerCase();
  rec['full_name'] = composeName(input);
  rec['website'] = normaliseWebsite(input.website);
  if (input.company_website !== undefined) rec['company_website'] = normaliseWebsite(input.company_website);
  rec['status'] = input.status || "new";
  rec['platform'] = input.platform || "Other";
  rec['tags'] = input.tags ?? [];
  if (!rec['email_domain']) rec['email_domain'] = rec['email'].split("@")[1] ?? null;
  if (input.custom_fields) rec['custom_fields'] = input.custom_fields;
  return rec;
}

export async function listLeads(
  sb: any,
  opts: { filters: LeadFilters; page: number; pageSize: number; sort: string; dir: "asc" | "desc" },
): Promise<{ rows: LeadRow[]; total: number }> {
  const from = (opts.page - 1) * opts.pageSize;
  let q: any = sb.from("leads").select(COLS, { count: "exact" });
  q = applyLeadFilters(q, opts.filters);
  q = q.order(opts.sort, { ascending: opts.dir === "asc" }).range(from, from + opts.pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as LeadRow[], total: count ?? 0 };
}

export async function exportRows(sb: any, filters: LeadFilters, ids?: string[]): Promise<LeadRow[]> {
  let q: any = sb.from("leads").select(COLS).order("created_at", { ascending: false }).limit(10000);
  if (ids && ids.length) q = q.in("id", ids);
  else q = applyLeadFilters(q, filters);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadRow[];
}

export async function getLead(sb: any, id: string): Promise<LeadRow | null> {
  const { data, error } = await sb.from("leads").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as LeadRow | null;
}

const DAY = 86400000;

export type DashboardStats = Awaited<ReturnType<typeof dashboardStats>>;

export async function dashboardStats(sb: any, range?: { from?: string | null; to?: string | null }) {
  const { data, error } = await sb
    .from("leads")
    .select("id, full_name, business_name, industry, email, source, platform, status, funnel_name, created_at")
    .order("created_at", { ascending: false })
    .limit(20000);
  if (error) throw new Error(error.message);
  const all = (data ?? []) as any[];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfDay.getTime() - DAY);
  const dow = (startOfDay.getDay() + 6) % 7;
  const startOfWeek = new Date(startOfDay.getTime() - dow * DAY);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let today = 0, yesterday = 0, week = 0, month = 0, qualified = 0, converted = 0;
  for (const r of all) {
    const t = new Date(r.created_at).getTime();
    if (t >= startOfDay.getTime()) today++;
    else if (t >= startOfYesterday.getTime()) yesterday++;
    if (t >= startOfWeek.getTime()) week++;
    if (t >= startOfMonth.getTime()) month++;
    if (["qualified", "converted"].includes(r.status)) qualified++;
    if (r.status === "converted") converted++;
  }

  const fromTs = range?.from ? new Date(range.from).getTime() : 0;
  const toTs = range?.to ? new Date(range.to).getTime() : Number.MAX_SAFE_INTEGER;
  const scoped = all.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= fromTs && t <= toTs;
  });

  const byIndustry = new Map<string, number>();
  const bySource = new Map<string, number>();
  const byPlatform = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const r of scoped) {
    inc(byIndustry, r.industry || "Unspecified");
    inc(bySource, r.source || "Unspecified");
    inc(byPlatform, r.platform || "Unspecified");
    inc(byStatus, r.status || "new");
  }

  // Daily series across the requested window (default: last 14 days).
  const seriesEnd = range?.to ? new Date(range.to) : now;
  const seriesStart = range?.from ? new Date(range.from) : new Date(startOfDay.getTime() - 13 * DAY);
  const startKey = new Date(seriesStart.getFullYear(), seriesStart.getMonth(), seriesStart.getDate()).getTime();
  const endKey = new Date(seriesEnd.getFullYear(), seriesEnd.getMonth(), seriesEnd.getDate()).getTime();
  const days = Math.min(180, Math.max(1, Math.round((endKey - startKey) / DAY) + 1));
  const series: { date: string; leads: number; qualified: number }[] = [];
  const idx = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(startKey + i * DAY);
    const key = d.toISOString().slice(0, 10);
    idx.set(key, series.length);
    series.push({ date: key, leads: 0, qualified: 0 });
  }
  for (const r of all) {
    const key = new Date(r.created_at).toISOString().slice(0, 10);
    const i = idx.get(key);
    if (i === undefined) continue;
    series[i]!.leads++;
    if (["qualified", "converted"].includes(r.status)) series[i]!.qualified++;
  }

  const list = (m: Map<string, number>) =>
    [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

  const industries = list(byIndustry);
  const sources = list(bySource);

  return {
    total: all.length,
    scopedTotal: scoped.length,
    fromFunnels: all.filter((r) => Boolean(r.funnel_name)).length,
    imported: all.filter((r) => String(r.source ?? "").toLowerCase() === "imported").length,
    today,
    yesterday,
    week,
    month,
    qualified,
    converted,
    conversionRate: all.length ? Math.round((converted / all.length) * 1000) / 10 : 0,
    topIndustry: industries[0] ?? null,
    topSource: sources[0] ?? null,
    byIndustry: industries,
    bySource: sources,
    byPlatform: list(byPlatform),
    byStatus: list(byStatus),
    series,
    recent: all.slice(0, 6),
  };
}

export async function bulkUpdate(
  sb: any,
  input: { ids: string[]; status?: string; addTags?: string[]; removeTags?: string[] },
) {
  if (input.status) {
    const { error } = await sb.from("leads").update({ status: input.status }).in("id", input.ids);
    if (error) throw new Error(error.message);
  }
  if ((input.addTags?.length ?? 0) || (input.removeTags?.length ?? 0)) {
    const { data, error } = await sb.from("leads").select("id, tags").in("id", input.ids);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as { id: string; tags: string[] | null }[]) {
      const tags = new Set(row.tags ?? []);
      for (const t of input.addTags ?? []) tags.add(t);
      for (const t of input.removeTags ?? []) tags.delete(t);
      const { error: uErr } = await sb.from("leads").update({ tags: [...tags] }).eq("id", row.id);
      if (uErr) throw new Error(uErr.message);
    }
  }
  return { updated: input.ids.length };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Turns a mapped import row into a leads record, collecting "custom:*" keys into custom_fields. */
function importRowToRecord(raw: Record<string, string | number | null>) {
  const rec: Record<string, any> = {};
  const custom: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const value = v === null || v === undefined ? "" : String(v).trim();
    if (k.startsWith("custom:")) {
      if (value) custom[k.slice(7)] = value;
      continue;
    }
    if (!WRITABLE_KEYS.includes(k)) continue;
    if (!value) continue;
    if (NUMERIC_FIELDS.has(k)) rec[k] = toNumber(value);
    else rec[k] = value;
  }
  const email = String(rec['email'] ?? "").trim().toLowerCase();
  rec['email'] = email;
  rec['email_domain'] = rec['email_domain'] ?? (email.split("@")[1] ?? null);
  rec['website'] = normaliseWebsite(rec['website']);
  if (rec['company_website']) rec['company_website'] = normaliseWebsite(rec['company_website']);
  rec['full_name'] =
    rec['full_name'] || [rec['first_name'], rec['last_name']].filter(Boolean).join(" ") || email;
  rec['source'] = rec['source'] || "Imported";
  rec['platform'] = rec['platform'] || "Other";
  rec['status'] = String(rec['status'] || "new").toLowerCase();
  const tagsRaw = rec['tags'];
  const tags = typeof tagsRaw === "string" && tagsRaw.trim()
    ? tagsRaw.split(/[;,|]/).map((t) => t.trim()).filter(Boolean)
    : [];
  if (!tags.includes("Imported")) tags.push("Imported");
  rec['tags'] = tags;
  rec['custom_fields'] = custom;
  return rec;
}

/** Client-side-safe dry run of an import file — used to build the preview screen. */
export function analyseImportRows(rows: Record<string, string | number | null>[]) {
  let invalid = 0;
  const seen = new Set<string>();
  let inFileDuplicates = 0;
  const emails: string[] = [];
  for (const raw of rows) {
    const email = String(raw['email'] ?? "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) { invalid++; continue; }
    if (seen.has(email)) { inFileDuplicates++; continue; }
    seen.add(email);
    emails.push(email);
  }
  return { invalid, inFileDuplicates, emails };
}

export async function previewImport(sb: any, rows: Record<string, string | number | null>[]) {
  const { invalid, inFileDuplicates, emails } = analyseImportRows(rows);
  const existing = new Set<string>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data, error } = await sb.from("leads").select("email").in("email", emails.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const r of (data ?? []) as { email: string }[]) existing.add(r.email.toLowerCase());
  }
  const duplicates = emails.filter((e) => existing.has(e)).length + inFileDuplicates;
  return {
    total: rows.length,
    invalid,
    duplicates,
    ready: Math.max(0, rows.length - invalid - duplicates),
  };
}

export async function importLeads(
  sb: any,
  input: { file_name: string; rows: Record<string, string | number | null>[]; duplicates: "skip" | "update" | "create" },
  userId: string,
): Promise<ImportSummary & { id: string | null }> {
  const total = input.rows.length;
  let invalid = 0, duplicates = 0, imported = 0, updated = 0, skipped = 0;

  const cleaned: Record<string, any>[] = [];
  const seen = new Set<string>();

  for (const raw of input.rows) {
    const email = String(raw['email'] ?? "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) { invalid++; continue; }
    if (seen.has(email)) { duplicates++; continue; }
    seen.add(email);
    cleaned.push(importRowToRecord({ ...raw, email }));
  }

  if (cleaned.length) {
    const emails = cleaned.map((c) => c['email'] as string);
    const existing = new Map<string, string>();
    for (let i = 0; i < emails.length; i += 200) {
      const { data, error } = await sb.from("leads").select("id, email").in("email", emails.slice(i, i + 200));
      if (error) throw new Error(error.message);
      for (const r of (data ?? []) as { id: string; email: string }[]) existing.set(r.email.toLowerCase(), r.id);
    }

    const fresh: Record<string, any>[] = [];
    for (const c of cleaned) {
      const id = existing.get(c['email'] as string);
      if (!id) { fresh.push(c); continue; }
      duplicates++;
      if (input.duplicates === "update") {
        const patch = { ...c };
        delete patch['tags'];
        const { error } = await sb.from("leads").update(patch).eq("id", id);
        if (!error) updated++; else skipped++;
      } else if (input.duplicates === "create") {
        skipped++; // unique email constraint prevents true duplicates
      } else {
        skipped++;
      }
    }

    for (let i = 0; i < fresh.length; i += 200) {
      const chunk = fresh.slice(i, i + 200);
      const { data, error } = await sb.from("leads").insert(chunk).select("id");
      if (error) { skipped += chunk.length; continue; }
      imported += (data ?? []).length;
    }
  }

  const { data: rec } = await sb
    .from("lead_imports")
    .insert({
      file_name: input.file_name,
      imported_count: imported,
      skipped_count: skipped,
      duplicate_count: duplicates,
      failed_count: invalid,
      total_rows: total,
      created_by: userId,
    })
    .select("id")
    .maybeSingle();

  return { imported, updated, skipped, duplicates, invalid, total, id: rec?.id ?? null };
}

export async function listSavedViews(sb: any) {
  const { data, error } = await sb
    .from("lead_saved_views")
    .select("id, name, filters, columns, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string; filters: LeadFilters; columns: string[]; created_at: string }[];
}

export async function createSavedView(
  sb: any,
  input: { name: string; filters: LeadFilters; columns: string[] },
  userId: string,
) {
  const { data, error } = await sb
    .from("lead_saved_views")
    .insert({ name: input.name, filters: input.filters, columns: input.columns, created_by: userId })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { id: data?.id as string };
}

export async function deleteSavedView(sb: any, id: string) {
  const { error } = await sb.from("lead_saved_views").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}