/** Central registry of every structured lead field Dock understands. */
export type FieldGroup = "contact" | "company" | "location" | "source" | "management";

export type FieldDef = {
  key: string;
  label: string;
  group: FieldGroup;
  type?: "text" | "number" | "tags" | "date";
  aliases?: string[];
};

export const LEAD_FIELDS: FieldDef[] = [
  // Contact
  { key: "first_name", label: "First Name", group: "contact", aliases: ["first name", "firstname", "given name", "fname"] },
  { key: "last_name", label: "Last Name", group: "contact", aliases: ["last name", "lastname", "surname", "family name", "lname"] },
  { key: "full_name", label: "Full Name", group: "contact", aliases: ["full name", "name", "contact", "contact name", "person name"] },
  { key: "email", label: "Email", group: "contact", aliases: ["email", "email address", "e-mail", "work email", "business email", "mail"] },
  { key: "personal_email", label: "Personal Email", group: "contact", aliases: ["personal email", "secondary email", "other email"] },
  { key: "phone", label: "Phone", group: "contact", aliases: ["phone", "phone number", "telephone", "tel", "contact number"] },
  { key: "mobile_phone", label: "Mobile Phone", group: "contact", aliases: ["mobile", "mobile phone", "mobile number", "cell", "cell phone"] },
  { key: "job_title", label: "Job Title", group: "contact", aliases: ["job title", "title", "role", "position"] },
  { key: "headline", label: "Headline", group: "contact", aliases: ["headline", "bio", "summary"] },
  { key: "seniority", label: "Seniority", group: "contact", aliases: ["seniority", "level"] },
  { key: "department", label: "Department", group: "contact", aliases: ["department", "dept", "function"] },
  { key: "linkedin", label: "LinkedIn", group: "contact", aliases: ["linkedin", "linkedin url", "linkedin profile", "person linkedin"] },
  { key: "twitter_url", label: "Twitter URL", group: "contact", aliases: ["twitter", "twitter url", "x", "x url"] },
  { key: "facebook_url", label: "Facebook URL", group: "contact", aliases: ["facebook", "facebook url"] },
  { key: "instagram_url", label: "Instagram URL", group: "contact", aliases: ["instagram", "instagram url", "ig", "ig url", "insta"] },
  { key: "personal_photo", label: "Personal Photo", group: "contact", aliases: ["personal photo", "photo", "avatar", "profile picture"] },
  { key: "person_id", label: "Person ID", group: "contact", aliases: ["person id", "personid", "contact id"] },

  // Company
  { key: "business_name", label: "Company Name", group: "company", aliases: ["company", "company name", "business", "business name", "organisation", "organization", "employer", "account"] },
  { key: "website", label: "Website", group: "company", aliases: ["website", "url", "site", "web"] },
  { key: "company_website", label: "Company Website", group: "company", aliases: ["company website", "company url", "corporate website"] },
  { key: "company_domain", label: "Company Domain", group: "company", aliases: ["company domain", "domain"] },
  { key: "company_phone", label: "Company Phone", group: "company", aliases: ["company phone", "company phone number", "office phone", "business phone", "hq phone"] },
  { key: "industry", label: "Industry", group: "company", aliases: ["industry", "vertical", "niche", "category", "sector"] },
  { key: "employees_count", label: "Employees Count", group: "company", type: "number", aliases: ["employees", "employees count", "employee count", "headcount", "company size", "num employees"] },
  { key: "company_annual_revenue", label: "Company Annual Revenue", group: "company", aliases: ["annual revenue", "company annual revenue", "revenue"] },
  { key: "company_revenue_clean", label: "Company Revenue (Clean)", group: "company", type: "number", aliases: ["company revenue clean", "revenue clean", "annual revenue clean"] },
  { key: "company_total_funding", label: "Company Total Funding", group: "company", aliases: ["total funding", "company total funding", "funding"] },
  { key: "company_total_funding_clean", label: "Company Total Funding (Clean)", group: "company", type: "number", aliases: ["total funding clean", "company total funding clean", "funding clean"] },
  { key: "company_technologies", label: "Company Technologies", group: "company", aliases: ["technologies", "company technologies", "tech stack"] },
  { key: "company_seo_description", label: "Company SEO Description", group: "company", aliases: ["seo description", "company seo description", "meta description"] },
  { key: "company_short_description", label: "Company Short Description", group: "company", aliases: ["short description", "company short description", "company description", "description"] },
  { key: "company_founded_year", label: "Company Founded Year", group: "company", type: "number", aliases: ["founded", "founded year", "company founded year", "year founded"] },
  { key: "company_linkedin", label: "Company LinkedIn", group: "company", aliases: ["company linkedin", "company linkedin url", "organization linkedin"] },
  { key: "company_linkedin_uid", label: "Company LinkedIn UID", group: "company", aliases: ["company linkedin uid", "linkedin uid", "linkedin company id"] },
  { key: "company_twitter", label: "Company Twitter", group: "company", aliases: ["company twitter", "company x", "company x url", "company twitter url"] },
  { key: "company_facebook", label: "Company Facebook", group: "company", aliases: ["company facebook", "company facebook url"] },
  { key: "company_logo", label: "Company Logo", group: "company", aliases: ["company logo", "logo"] },
  { key: "company_id", label: "Company ID", group: "company", aliases: ["company id", "companyid", "account id"] },
  { key: "email_domain", label: "Email Domain", group: "company", aliases: ["email domain"] },
  { key: "email_domain_catchall", label: "Email Domain Catchall", group: "company", aliases: ["email domain catchall", "catchall", "catch all", "domain catchall"] },
  { key: "keywords", label: "Keywords", group: "company", aliases: ["keywords", "tags keywords", "search keywords"] },

  // Location
  { key: "city", label: "City", group: "location", aliases: ["city", "town"] },
  { key: "state", label: "State", group: "location", aliases: ["state", "province", "region"] },
  { key: "country", label: "Country", group: "location", aliases: ["country", "nation"] },
  { key: "location", label: "Location", group: "location", aliases: ["location", "address", "full address"] },
  { key: "company_city", label: "Company City", group: "location", aliases: ["company city", "hq city"] },
  { key: "company_state", label: "Company State", group: "location", aliases: ["company state", "hq state"] },
  { key: "company_country", label: "Company Country", group: "location", aliases: ["company country", "hq country"] },
  { key: "company_street_address", label: "Company Street Address", group: "location", aliases: ["company street address", "street address", "company street"] },
  { key: "company_raw_address", label: "Company Raw Address", group: "location", aliases: ["company raw address", "raw address", "company address", "company full address"] },
  { key: "company_postal_code", label: "Company Postal Code", group: "location", aliases: ["company postal code", "postal code", "zip", "zip code", "postcode", "company zip", "company postcode"] },

  // Source
  { key: "source", label: "Source", group: "source", aliases: ["source", "lead source", "acquisition"] },
  { key: "platform", label: "Platform", group: "source", aliases: ["platform", "channel", "network"] },
  { key: "funnel_name", label: "Funnel", group: "source", aliases: ["funnel", "funnel name", "campaign"] },

  // Management
  { key: "status", label: "Status", group: "management", aliases: ["status", "stage"] },
  { key: "lead_score", label: "Lead Score", group: "management", type: "number", aliases: ["lead score", "score"] },
  { key: "tags", label: "Tags", group: "management", type: "tags", aliases: ["tags", "labels", "segments"] },
  { key: "notes", label: "Notes", group: "management", aliases: ["notes", "note", "comment", "comments", "remarks"] },
];

export const GROUP_LABEL: Record<FieldGroup, string> = {
  contact: "Contact",
  company: "Company",
  location: "Location",
  source: "Source",
  management: "Lead Management",
};

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  LEAD_FIELDS.map((f) => [f.key, f]),
);

export const NUMERIC_FIELDS = new Set(LEAD_FIELDS.filter((f) => f.type === "number").map((f) => f.key));

/** Columns that are writable on the leads table via mapping/forms. */
export const WRITABLE_KEYS = LEAD_FIELDS.map((f) => f.key);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const LOOKUP = new Map<string, string>();
for (const f of LEAD_FIELDS) {
  LOOKUP.set(norm(f.key), f.key);
  LOOKUP.set(norm(f.label), f.key);
  for (const a of f.aliases ?? []) LOOKUP.set(norm(a), f.key);
}

/** Best-effort match of a spreadsheet header to a Dock field key. */
export function guessField(header: string): string | "" {
  const n = norm(header);
  if (!n) return "";
  const direct = LOOKUP.get(n);
  if (direct) return direct;
  // singular/plural + "the" tolerance
  const alt = n.endsWith("s") ? n.slice(0, -1) : `${n}s`;
  return LOOKUP.get(alt) ?? "";
}

/** Default visible columns in the leads table. */
export const DEFAULT_COLUMNS = [
  "full_name", "business_name", "email", "industry", "funnel_name", "source", "website", "status", "created_at",
];

export const TABLE_COLUMNS: { key: string; label: string }[] = [
  { key: "full_name", label: "Name" },
  { key: "business_name", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "mobile_phone", label: "Mobile" },
  { key: "industry", label: "Industry" },
  { key: "funnel_name", label: "Funnel" },
  { key: "source", label: "Source" },
  { key: "platform", label: "Platform" },
  { key: "website", label: "Website" },
  { key: "status", label: "Status" },
  { key: "lead_score", label: "Score" },
  { key: "job_title", label: "Job Title" },
  { key: "seniority", label: "Seniority" },
  { key: "department", label: "Department" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "company_linkedin", label: "Company LinkedIn" },
  { key: "employees_count", label: "Employees" },
  { key: "company_annual_revenue", label: "Revenue" },
  { key: "company_total_funding", label: "Funding" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "tags", label: "Tags" },
  { key: "created_at", label: "Created" },
];