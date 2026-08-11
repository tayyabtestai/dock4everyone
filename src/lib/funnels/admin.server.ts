/* eslint-disable @typescript-eslint/no-explicit-any */
import { slugify } from "./taxonomy";

/**
 * Server-only data access for the Funnels module. Funnels are stored in the
 * existing `rr_*` calculator tables; submissions and leads are joined to
 * produce real performance numbers (no fabricated metrics). All aggregation is
 * done in-process, mirroring the Leads dashboardStats approach.
 */

export { assertAdmin } from "@/lib/leads/admin.server";

const DAY = 86_400_000;

export type FunnelStats = {
  views: number;
  submissions: number;
  leads: number;
  conversion: number; // percent, one decimal
  spark: number[]; // submissions per day, last 7 days
};

export type FunnelRow = {
  id: string;
  name: string;
  description: string;
  slug: string;
  industries: string[];
  status: string;
  tagline: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
} & FunnelStats;

export type ListFunnelsOpts = {
  tab: "all" | "published" | "draft" | "archived";
  search?: string;
  industry?: string;
  sort: "newest" | "oldest" | "views" | "submissions" | "conversion" | "name";
};

type RawCalc = {
  id: string;
  name: string;
  description: string;
  slug: string;
  industries: string[] | null;
  status: string;
  tagline: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

/** Fetches every calculator plus the event/submission/lead rows needed for stats. */
async function loadRaw(sb: any) {
  const [calcsRes, eventsRes, subsRes, leadsRes] = await Promise.all([
    sb
      .from("rr_calculators")
      .select(
        "id, name, description, slug, industries, status, tagline, created_at, updated_at, published_at",
      )
      .order("created_at", { ascending: false })
      .limit(2000),
    sb
      .from("rr_events")
      .select("calculator_id, event, created_at")
      .eq("event", "view")
      .limit(50000),
    sb.from("rr_submissions").select("id, calculator_id, created_at").limit(50000),
    sb.from("leads").select("id, funnel_id, created_at").not("funnel_id", "is", null).limit(50000),
  ]);
  for (const r of [calcsRes, eventsRes, subsRes, leadsRes]) {
    if (r.error) throw new Error(r.error.message);
  }
  return {
    calcs: (calcsRes.data ?? []) as RawCalc[],
    events: (eventsRes.data ?? []) as { calculator_id: string; created_at: string }[],
    subs: (subsRes.data ?? []) as { calculator_id: string; created_at: string }[],
    leads: (leadsRes.data ?? []) as { funnel_id: string; created_at: string }[],
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function computeStats(
  id: string,
  events: { calculator_id: string; created_at: string }[],
  subs: { calculator_id: string; created_at: string }[],
  leads: { funnel_id: string; created_at: string }[],
): FunnelStats {
  const views = events.filter((e) => e.calculator_id === id).length;
  const mySubs = subs.filter((s) => s.calculator_id === id);
  const submissions = mySubs.length;
  const leadCount = leads.filter((l) => l.funnel_id === id).length;
  const conversion = views > 0 ? round1((submissions / views) * 100) : 0;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const spark = Array.from({ length: 7 }, () => 0);
  for (const s of mySubs) {
    const days = Math.floor((startOfToday.getTime() - new Date(s.created_at).getTime()) / DAY);
    if (days >= 0 && days < 7) spark[6 - days] = (spark[6 - days] ?? 0) + 1;
  }
  return { views, submissions, leads: leadCount, conversion, spark };
}

export async function listFunnels(sb: any, opts: ListFunnelsOpts) {
  const { calcs, events, subs, leads } = await loadRaw(sb);

  const counts = {
    all: calcs.length,
    published: calcs.filter((c) => c.status === "published").length,
    draft: calcs.filter((c) => c.status === "draft").length,
    archived: calcs.filter((c) => c.status === "archived").length,
  };

  let rows: FunnelRow[] = calcs.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    slug: c.slug,
    industries: c.industries ?? [],
    status: c.status,
    tagline: c.tagline ?? "",
    created_at: c.created_at,
    updated_at: c.updated_at,
    published_at: c.published_at,
    ...computeStats(c.id, events, subs, leads),
  }));

  if (opts.tab !== "all") rows = rows.filter((r) => r.status === opts.tab);
  if (opts.industry)
    rows = rows.filter((r) =>
      (r.industries.length ? r.industries : ["All Industries"]).includes(opts.industry!),
    );
  if (opts.search) {
    const needle = opts.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        r.slug.toLowerCase().includes(needle),
    );
  }

  const sorters: Record<ListFunnelsOpts["sort"], (a: FunnelRow, b: FunnelRow) => number> = {
    newest: (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    oldest: (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
    views: (a, b) => b.views - a.views,
    submissions: (a, b) => b.submissions - a.submissions,
    conversion: (a, b) => b.conversion - a.conversion,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  rows.sort(sorters[opts.sort]);

  return { rows, counts };
}

function inWindow(ts: string, from: number, to: number): boolean {
  const t = +new Date(ts);
  return t >= from && t < to;
}

export type FunnelKpis = Awaited<ReturnType<typeof funnelKpis>>;

export async function funnelKpis(sb: any) {
  const { calcs, events, subs, leads } = await loadRaw(sb);
  const publishedIds = new Set(calcs.filter((c) => c.status === "published").map((c) => c.id));

  const pubViews = events.filter((e) => publishedIds.has(e.calculator_id));
  const pubSubs = subs.filter((s) => publishedIds.has(s.calculator_id));

  const totalViews = pubViews.length;
  const totalSubmissions = pubSubs.length;
  const conversionRate = totalViews > 0 ? round1((totalSubmissions / totalViews) * 100) : 0;
  const leadsGenerated = leads.length;

  // 7-day vs previous-7-day windows for trend indicators.
  const now = Date.now();
  const last7 = now - 7 * DAY;
  const prev7 = now - 14 * DAY;
  const win = <T extends { created_at: string }>(arr: T[], from: number, to: number) =>
    arr.filter((r) => inWindow(r.created_at, from, to)).length;

  const viewsDelta = win(pubViews, last7, now) - win(pubViews, prev7, last7);
  const subsDelta = win(pubSubs, last7, now) - win(pubSubs, prev7, last7);
  const leadsDelta = win(leads, last7, now) - win(leads, prev7, last7);

  const convLast = (() => {
    const v = win(pubViews, last7, now);
    const s = win(pubSubs, last7, now);
    return v > 0 ? (s / v) * 100 : 0;
  })();
  const convPrev = (() => {
    const v = win(pubViews, prev7, last7);
    const s = win(pubSubs, prev7, last7);
    return v > 0 ? (s / v) * 100 : 0;
  })();
  const conversionDelta = round1(convLast - convPrev);

  const publishedLast7 = calcs.filter(
    (c) => c.published_at && inWindow(c.published_at, last7, now),
  ).length;

  return {
    activeFunnels: publishedIds.size,
    activeFunnelsDelta: publishedLast7,
    totalViews,
    totalViewsDelta: viewsDelta,
    totalSubmissions,
    totalSubmissionsDelta: subsDelta,
    conversionRate,
    conversionRateDelta: conversionDelta,
    leadsGenerated,
    leadsGeneratedDelta: leadsDelta,
  };
}

export async function getFunnelDetail(sb: any, id: string) {
  const { data: calc, error } = await sb
    .from("rr_calculators")
    .select(
      "id, name, description, slug, industries, status, tagline, outcome, settings, created_at, updated_at, published_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!calc) return null;

  const [{ count: views }, subsRes, leadsRes] = await Promise.all([
    sb
      .from("rr_events")
      .select("id", { count: "exact", head: true })
      .eq("calculator_id", id)
      .eq("event", "view"),
    sb
      .from("rr_submissions")
      .select("id, created_at, lead_id, score, industry")
      .eq("calculator_id", id)
      .order("created_at", { ascending: false })
      .limit(6),
    sb.from("leads").select("id", { count: "exact", head: true }).eq("funnel_id", id),
  ]);
  if (subsRes.error) throw new Error(subsRes.error.message);

  const recent = (subsRes.data ?? []) as {
    id: string;
    created_at: string;
    lead_id: string | null;
    score: number | null;
    industry: string | null;
  }[];
  const leadIds = recent.map((r) => r.lead_id).filter(Boolean) as string[];
  const leadMap = new Map<
    string,
    { full_name: string; business_name: string | null; industry: string | null }
  >();
  if (leadIds.length) {
    const { data: leadRows } = await sb
      .from("leads")
      .select("id, full_name, business_name, industry")
      .in("id", leadIds);
    for (const l of (leadRows ?? []) as any[])
      leadMap.set(l.id, {
        full_name: l.full_name,
        business_name: l.business_name,
        industry: l.industry,
      });
  }

  const submissionsCount =
    (
      await sb
        .from("rr_submissions")
        .select("id", { count: "exact", head: true })
        .eq("calculator_id", id)
    ).count ?? 0;
  const viewCount = views ?? 0;

  return {
    ...calc,
    stats: {
      views: viewCount,
      submissions: submissionsCount,
      leads: leadsRes.count ?? 0,
      conversion: viewCount > 0 ? round1((submissionsCount / viewCount) * 100) : 0,
    },
    recentSubmissions: recent.map((r) => {
      const lead = r.lead_id ? leadMap.get(r.lead_id) : undefined;
      return {
        id: r.id,
        lead_id: r.lead_id,
        created_at: r.created_at,
        score: r.score,
        name: lead?.full_name ?? "Anonymous",
        business_name: lead?.business_name ?? null,
        industry: lead?.industry ?? r.industry ?? null,
      };
    }),
  };
}

/** Generates a slug unique across existing calculators. */
async function uniqueSlug(sb: any, base: string): Promise<string> {
  const root = slugify(base) || "funnel";
  const { data } = await sb.from("rr_calculators").select("slug").ilike("slug", `${root}%`);
  const taken = new Set(((data ?? []) as { slug: string }[]).map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export async function createFunnel(
  sb: any,
  input: {
    name: string;
    description?: string;
    industries: string[];
    status: "draft" | "published";
    slug?: string;
  },
  userId: string,
) {
  const slug = await uniqueSlug(sb, input.slug || input.name);
  const key = slug.replace(/-/g, "_");
  const now = new Date().toISOString();
  const record = {
    key,
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || "",
    industries: input.industries,
    status: input.status,
    published_at: input.status === "published" ? now : null,
    created_by: userId,
  };
  const { data, error } = await sb
    .from("rr_calculators")
    .insert(record)
    .select("id, slug")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") throw new Error("A funnel with this name or slug already exists.");
    throw new Error(error.message);
  }
  return { id: data?.id as string, slug: data?.slug as string };
}

export async function setFunnelStatus(
  sb: any,
  id: string,
  status: "draft" | "published" | "archived",
) {
  const patch: Record<string, any> = { status };
  if (status === "published") patch["published_at"] = new Date().toISOString();
  const { error } = await sb.from("rr_calculators").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function duplicateFunnel(sb: any, id: string, userId: string) {
  const { data: src, error } = await sb
    .from("rr_calculators")
    .select("name, description, industries, tagline, outcome, settings")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!src) throw new Error("Funnel not found.");
  const name = `${src.name} (copy)`;
  const slug = await uniqueSlug(sb, name);
  const record = {
    key: slug.replace(/-/g, "_"),
    name,
    slug,
    description: src.description ?? "",
    industries: src.industries ?? [],
    tagline: src.tagline ?? "",
    outcome: src.outcome ?? "",
    settings: src.settings ?? {},
    status: "draft",
    created_by: userId,
  };
  const { data, error: insErr } = await sb
    .from("rr_calculators")
    .insert(record)
    .select("id")
    .maybeSingle();
  if (insErr) throw new Error(insErr.message);

  // Copy questions so the duplicate is functional once the builder lands.
  const { data: qs } = await sb.from("rr_questions").select("*").eq("calculator_id", id);
  if (qs && (qs as any[]).length) {
    const clones = (qs as any[]).map(
      ({ id: _drop, calculator_id: _c, created_at: _ca, updated_at: _ua, ...rest }) => ({
        ...rest,
        calculator_id: data!.id,
      }),
    );
    await sb.from("rr_questions").insert(clones);
  }
  return { id: data?.id as string };
}

export async function deleteFunnel(sb: any, id: string) {
  const { error } = await sb.from("rr_calculators").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
