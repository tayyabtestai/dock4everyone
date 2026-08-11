import { INDUSTRIES } from "@/lib/leads/taxonomy";

/**
 * Funnels reuse the `rr_*` calculator tables. This module keeps the funnel
 * vocabulary (statuses, industries, badge tones) in one place so the admin UI
 * stays consistent with the Leads module's badge system.
 */

export const FUNNEL_STATUSES = ["published", "draft", "archived"] as const;
export type FunnelStatus = (typeof FUNNEL_STATUSES)[number];

export const FUNNEL_STATUS_LABEL: Record<FunnelStatus, string> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

/** Dot + pill tones for the status chip, echoing Leads' STATUS_TONE approach. */
export const FUNNEL_STATUS_TONE: Record<FunnelStatus, { dot: string; pill: string }> = {
  published: { dot: "bg-[var(--chart-5)]", pill: "bg-[var(--chart-5)]/12 text-ink" },
  draft: { dot: "bg-[var(--chart-4)]", pill: "bg-[var(--chart-4)]/12 text-ink" },
  archived: { dot: "bg-muted-foreground", pill: "bg-secondary text-muted-foreground" },
};

/** "All Industries" first, then the shared lead industry taxonomy. */
export const FUNNEL_INDUSTRY_OPTIONS = ["All Industries", ...INDUSTRIES] as const;

/**
 * Deterministic subtle tint for an industry badge. Hashing (rather than a fixed
 * map) keeps the palette extensible — new industries render sensibly without a
 * code change, per the "don't hard-code industries" requirement.
 */
const INDUSTRY_TINTS = [
  "bg-[var(--chart-1)]/10 text-ink",
  "bg-[var(--chart-3)]/12 text-ink",
  "bg-[var(--chart-4)]/12 text-ink",
  "bg-[var(--chart-5)]/12 text-ink",
  "bg-[var(--chart-2)]/12 text-ink",
] as const;

export function industryTone(name: string): string {
  const label = (name || "").trim();
  if (!label || label === "All Industries") return "bg-secondary text-muted-foreground";
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return INDUSTRY_TINTS[Math.abs(hash) % INDUSTRY_TINTS.length]!;
}

/** The badge label for a funnel's `industries` array. */
export function primaryIndustry(industries: string[] | null | undefined): string {
  const list = (industries ?? []).filter(Boolean);
  if (!list.length) return "All Industries";
  return list[0]!;
}

/** Turns a funnel name into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
