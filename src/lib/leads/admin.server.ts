/* eslint-disable @typescript-eslint/no-explicit-any */
import { applyLeadFilters, type LeadFilters } from "./filters";
import { normaliseWebsite } from "./taxonomy";
import type { ImportSummary, LeadWrite } from "./schemas";

const COLS =
  "id, first_name, last_name, full_name, email, phone, business_name, industry, website, source, platform, status, tags, notes, job_title, location, country, lead_score, funnel_id, funnel_name, funnel_version, funnel_score, funnel_response_data, funnel_result, created_at, updated_at";

export type LeadRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  industry: string | null;
  website: string | null;
  source: string | null;
  platform: string | null;
  status: string;
  tags: string[] | null;
  notes: string | null;
  job_title: string | null;
  location: string | null;
  country: string | null;
  lead_score: number | null;
  funnel_id: string | null;
  funnel_name: string | null;
  funnel_version: string | null;
  funnel_score: number | null;
  funnel_response_data: unknown;
  funnel_result: unknown;
  created_at: string;
  updated_at: string;
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

export function toRecord(input: LeadWrite) {
  return {
    first_name: input.first_name || null,
    last_name: input.last_name || null,
    full_name: composeName(input),
    email: input.email.trim().toLowerCase(),
    phone: input.phone || null,
    business_name: input.business_name || null,
    industry: input.industry || null,
    website: normaliseWebsite(input.website),
    source: input.source || null,
    platform: input.platform || "Other",
    status: input.status || "new",
    tags: input.tags ?? [],
    notes: input.notes || null,
    job_title: input.job_title || null,
    location: input.location || null,
    country: input.country || null,
    funnel_name: input.funnel_name || null,
  };
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

export async function exportRows(sb: any, filters: LeadFilters): Promise<LeadRow[]> {
  let q: any = sb.from("leads").select(COLS).order("created_at", { ascending: false }).limit(10000);
  q = applyLeadFilters(q, filters);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadRow[];
}

export async function getLead(sb: any, id: string): Promise<LeadRow | null> {
  const { data, error } = await sb.from("leads").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as LeadRow | null;
}

export async function dashboardStats(sb: any) {
  const { data, error } = await sb
    .from("leads")
    .select("id, full_name, business_name, industry, email, source, platform, tags, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as any[];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfDay.getTime() - 86400000);
  const dow = (startOfDay.getDay() + 6) % 7; // Monday-first
  const startOfWeek = new Date(startOfDay.getTime() - dow * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let today = 0, yesterday = 0, week = 0, month = 0;
  const byIndustry = new Map<string, number>();
  const bySource = new Map<string, number>();
  const byPlatform = new Map<string, number>();
  const byStatus = new Map<string, number>();

  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (t >= startOfDay.getTime()) today++;
    else if (t >= startOfYesterday.getTime()) yesterday++;
    if (t >= startOfWeek.getTime()) week++;
    if (t >= startOfMonth.getTime()) month++;
    const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
    inc(byIndustry, r.industry || "Unspecified");
    inc(bySource, r.source || "Unspecified");
    inc(byPlatform, r.platform || "Unspecified");
    inc(byStatus, r.status || "new");
  }

  const list = (m: Map<string, number>) =>
    [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

  return {
    total: rows.length,
    today,
    yesterday,
    week,
    month,
    byIndustry: list(byIndustry),
    bySource: list(bySource),
    byPlatform: list(byPlatform),
    byStatus: list(byStatus),
    recent: rows.slice(0, 8),
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
      let tags = new Set(row.tags ?? []);
      for (const t of input.addTags ?? []) tags.add(t);
      for (const t of input.removeTags ?? []) tags.delete(t);
      const { error: uErr } = await sb.from("leads").update({ tags: [...tags] }).eq("id", row.id);
      if (uErr) throw new Error(uErr.message);
    }
  }
  return { updated: input.ids.length };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function importLeads(
  sb: any,
  input: { file_name: string; rows: Record<string, string | number | null>[] },
  userId: string,
): Promise<ImportSummary & { id: string | null }> {
  const total = input.rows.length;
  let invalid = 0, duplicates = 0, imported = 0, skipped = 0;

  const cleaned: Record<string, any>[] = [];
  const seen = new Set<string>();

  for (const raw of input.rows) {
    const email = String(raw['email'] ?? "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) { invalid++; continue; }
    if (seen.has(email)) { duplicates++; continue; }
    seen.add(email);
    const tagsRaw = raw['tags'];
    const tags = typeof tagsRaw === "string" && tagsRaw.trim()
      ? tagsRaw.split(/[;,|]/).map((t) => t.trim()).filter(Boolean)
      : [];
    if (!tags.includes("Imported")) tags.push("Imported");
    const str = (k: string) => {
      const v = raw[k];
      return v === null || v === undefined || String(v).trim() === "" ? null : String(v).trim();
    };
    cleaned.push({
      first_name: str("first_name"),
      last_name: str("last_name"),
      full_name: str("full_name") || [str("first_name"), str("last_name")].filter(Boolean).join(" ") || email,
      email,
      phone: str("phone"),
      business_name: str("business_name"),
      industry: str("industry"),
      website: normaliseWebsite(str("website")),
      source: str("source") || "Imported",
      platform: str("platform") || "Other",
      status: (str("status") || "new").toLowerCase(),
      job_title: str("job_title"),
      location: str("location"),
      country: str("country"),
      notes: str("notes"),
      tags,
    });
  }

  if (cleaned.length) {
    const emails = cleaned.map((c) => c['email'] as string);
    const existing = new Set<string>();
    for (let i = 0; i < emails.length; i += 200) {
      const { data, error } = await sb.from("leads").select("email").in("email", emails.slice(i, i + 200));
      if (error) throw new Error(error.message);
      for (const r of (data ?? []) as { email: string }[]) existing.add(r.email.toLowerCase());
    }
    const fresh = cleaned.filter((c) => {
      if (existing.has(c['email'] as string)) { duplicates++; return false; }
      return true;
    });
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

  return { imported, skipped, duplicates, invalid, total, id: rec?.id ?? null };
}
