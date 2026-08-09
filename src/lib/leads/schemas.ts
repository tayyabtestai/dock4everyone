import { z } from "zod";
import { LeadFilterSchema } from "./filters";

const txt = (max = 300) => z.string().trim().max(max).optional().nullable();
const num = () =>
  z
    .union([z.number(), z.string(), z.null()])
    .transform((v) => {
      if (v === null || v === "") return null;
      const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.-]/g, ""));
      return Number.isFinite(n) ? n : null;
    })
    .optional();

export const LeadWriteSchema = z.object({
  first_name: txt(80),
  last_name: txt(80),
  full_name: txt(160),
  email: z.string().trim().email().max(255),
  personal_email: txt(255),
  phone: txt(60),
  mobile_phone: txt(60),
  business_name: txt(200),
  industry: txt(120),
  website: txt(400),
  company_website: txt(400),
  company_domain: txt(200),
  company_phone: txt(60),
  source: txt(60),
  platform: txt(60),
  status: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(50).optional(),
  notes: z.string().max(20000).optional().nullable(),
  job_title: txt(160),
  headline: txt(500),
  seniority: txt(80),
  department: txt(120),
  linkedin: txt(400),
  company_linkedin: txt(400),
  company_linkedin_uid: txt(120),
  twitter_url: txt(400),
  facebook_url: txt(400),
  company_twitter: txt(400),
  company_facebook: txt(400),
  company_logo: txt(600),
  personal_photo: txt(600),
  person_id: txt(120),
  company_id: txt(120),
  email_domain: txt(200),
  keywords: txt(2000),
  company_technologies: txt(4000),
  company_seo_description: txt(4000),
  company_short_description: txt(4000),
  company_annual_revenue: txt(120),
  company_total_funding: txt(120),
  location: txt(200),
  city: txt(120),
  state: txt(120),
  country: txt(120),
  company_city: txt(120),
  company_state: txt(120),
  company_country: txt(120),
  employees_count: num(),
  company_revenue_clean: num(),
  company_total_funding_clean: num(),
  company_founded_year: num(),
  lead_score: num(),
  funnel_name: txt(160),
  custom_fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export type LeadWrite = z.infer<typeof LeadWriteSchema>;

export const ListLeadsSchema = z.object({
  filters: LeadFilterSchema.default({}),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(25),
  sort: z.enum(["created_at", "full_name", "business_name"]).default("created_at"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

export const BulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(1000),
  status: z.string().max(40).optional(),
  addTags: z.array(z.string().trim().min(1).max(40)).optional(),
  removeTags: z.array(z.string().trim().min(1).max(40)).optional(),
});

export const ImportSchema = z.object({
  file_name: z.string().max(255),
  /** Row keys are Dock field keys, or "custom:Label" for preserved custom fields. */
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(5000),
  duplicates: z.enum(["skip", "update", "create"]).default("skip"),
});

export type ImportSummary = {
  imported: number;
  skipped: number;
  duplicates: number;
  invalid: number;
  total: number;
};
