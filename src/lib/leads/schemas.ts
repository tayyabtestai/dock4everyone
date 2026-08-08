import { z } from "zod";
import { LeadFilterSchema } from "./filters";

export const LeadWriteSchema = z.object({
  first_name: z.string().trim().max(80).optional().nullable(),
  last_name: z.string().trim().max(80).optional().nullable(),
  full_name: z.string().trim().max(160).optional().nullable(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().nullable(),
  business_name: z.string().trim().max(160).optional().nullable(),
  industry: z.string().trim().max(80).optional().nullable(),
  website: z.string().trim().max(300).optional().nullable(),
  source: z.string().trim().max(60).optional().nullable(),
  platform: z.string().trim().max(60).optional().nullable(),
  status: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  notes: z.string().max(5000).optional().nullable(),
  job_title: z.string().trim().max(120).optional().nullable(),
  location: z.string().trim().max(160).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
  funnel_name: z.string().trim().max(120).optional().nullable(),
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
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(5000),
});

export type ImportSummary = {
  imported: number;
  skipped: number;
  duplicates: number;
  invalid: number;
  total: number;
};
