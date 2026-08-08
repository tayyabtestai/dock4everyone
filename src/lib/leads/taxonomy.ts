export const INDUSTRIES = [
  "Roofing", "Plumbing", "HVAC", "Dental", "Salons", "Law Firms",
  "Real Estate", "Pool Installers", "Dog Groomers", "Photographers",
  "Franchises", "Custom Furniture", "Other",
] as const;

export const SOURCES = ["Organic", "Paid", "Referral", "Imported", "Direct", "Other"] as const;

export const PLATFORMS = [
  "Google", "Facebook", "Instagram", "LinkedIn", "Website", "WhatsApp",
  "X", "YouTube", "Threads", "Reddit", "Other",
] as const;

export const STATUSES = ["new", "contacted", "qualified", "nurturing", "converted", "lost"] as const;

export type LeadStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  new: "New", contacted: "Contacted", qualified: "Qualified",
  nurturing: "Nurturing", converted: "Converted", lost: "Lost",
};

/** Importable target fields, in mapping-UI order. */
export const IMPORT_FIELDS = [
  { key: "first_name", label: "First Name", aliases: ["first name", "firstname", "given name", "fname"] },
  { key: "last_name", label: "Last Name", aliases: ["last name", "lastname", "surname", "lname"] },
  { key: "full_name", label: "Full Name", aliases: ["full name", "name", "contact", "contact name"] },
  { key: "email", label: "Email", aliases: ["email", "email address", "e-mail", "mail"] },
  { key: "phone", label: "Phone", aliases: ["phone", "phone number", "mobile", "telephone", "tel"] },
  { key: "business_name", label: "Business Name", aliases: ["business", "business name", "company", "company name", "organisation", "organization"] },
  { key: "industry", label: "Industry", aliases: ["industry", "vertical", "niche", "category"] },
  { key: "website", label: "Website", aliases: ["website", "url", "site", "web"] },
  { key: "source", label: "Source", aliases: ["source", "lead source", "acquisition"] },
  { key: "platform", label: "Platform", aliases: ["platform", "channel", "network"] },
  { key: "status", label: "Status", aliases: ["status", "stage"] },
  { key: "job_title", label: "Job Title", aliases: ["job title", "title", "role", "position"] },
  { key: "location", label: "Location", aliases: ["location", "city", "address", "region"] },
  { key: "country", label: "Country", aliases: ["country"] },
  { key: "tags", label: "Tags", aliases: ["tags", "labels", "segments"] },
  { key: "notes", label: "Notes", aliases: ["notes", "note", "comment", "comments"] },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

export function guessMapping(header: string): ImportFieldKey | "" {
  const h = header.trim().toLowerCase();
  for (const f of IMPORT_FIELDS) {
    if (f.key === h) return f.key;
    if ((f.aliases as readonly string[]).includes(h)) return f.key;
  }
  return "";
}

export function normaliseWebsite(raw?: string | null): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}
