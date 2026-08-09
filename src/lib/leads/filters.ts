import { z } from "zod";

export const LeadFilterSchema = z.object({
  search: z.string().trim().max(200).optional(),
  industry: z.string().optional(),
  source: z.string().optional(),
  platform: z.string().optional(),
  status: z.string().optional(),
  funnel: z.string().optional(),
  tags: z.array(z.string()).optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  minEmployees: z.number().optional(),
  minScore: z.number().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type LeadFilters = z.infer<typeof LeadFilterSchema>;

export const EMPTY_FILTERS: LeadFilters = {};

export function hasActiveFilters(f: LeadFilters): boolean {
  return Boolean(
    f.search || f.industry || f.source || f.platform || f.status || f.funnel || f.country || f.city ||
    f.minEmployees || f.minScore || f.from || f.to || (f.tags && f.tags.length),
  );
}

/** Applies filters to a PostgREST query builder. Kept generic so type-checking stays cheap. */
export function applyLeadFilters<T extends Record<string, unknown>>(query: T, f: LeadFilters): T {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let q: any = query;
  if (f.industry) q = q.eq("industry", f.industry);
  if (f.source) q = q.eq("source", f.source);
  if (f.platform) q = q.eq("platform", f.platform);
  if (f.status) q = q.eq("status", f.status);
  if (f.funnel) q = q.eq("funnel_name", f.funnel);
  if (f.country) q = q.ilike("country", f.country);
  if (f.city) q = q.ilike("city", `%${f.city}%`);
  if (f.minEmployees) q = q.gte("employees_count", f.minEmployees);
  if (f.minScore) q = q.gte("lead_score", f.minScore);
  if (f.tags && f.tags.length) q = q.contains("tags", f.tags);
  if (f.from) q = q.gte("created_at", f.from);
  if (f.to) q = q.lte("created_at", f.to);
  if (f.search) {
    const s = f.search.replace(/[%,()]/g, " ").trim();
    if (s) {
      q = q.or(
        [
          `full_name.ilike.%${s}%`,
          `email.ilike.%${s}%`,
          `business_name.ilike.%${s}%`,
          `phone.ilike.%${s}%`,
          `website.ilike.%${s}%`,
        ].join(","),
      );
    }
  }
  return q as T;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
