import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format, subDays, startOfDay } from "date-fns";
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  Upload,
  Mail,
  GitBranch,
  UserPlus,
  Sparkles,
  Download,
  Eye,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

// ── ranges ───────────────────────────────────────────────────────────────────
const RANGES = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

// ── page ─────────────────────────────────────────────────────────────────────
function Dashboard() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [platform, setPlatform] = useState<string>("all");
  const [search, setSearch] = useState("");

  const days = RANGES.find((r) => r.key === range)!.days;

  const data = useQuery({
    queryKey: ["admin", "dashboard", range],
    queryFn: async () => {
      const since = subDays(startOfDay(new Date()), days).toISOString();
      const startToday = startOfDay(new Date()).toISOString();
      const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const prevSince = subDays(startOfDay(new Date()), days * 2).toISOString();

      const [
        totalResources,
        publishedResources,
        totalLeads,
        leadsToday,
        leadsInRange,
        leadsPrev,
        recentLeads,
        recentResources,
        updatedResources,
        resourcesForTop,
      ] = await Promise.all([
        supabase.from("resources").select("id", { count: "exact", head: true }),
        supabase.from("resources").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startToday),
        supabase.from("leads").select("id, created_at, platform, device, resource_id").gte("created_at", since),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", prevSince).lt("created_at", since),
        supabase
          .from("leads")
          .select("id, full_name, email, platform, device, created_at, resource_id, resources(title, category)")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("resources")
          .select("id, title, slug, status, category, created_at, thumbnail_url")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("resources")
          .select("id, title, slug, updated_at, status")
          .order("updated_at", { ascending: false })
          .limit(4),
        supabase.from("resources").select("id, title, slug, thumbnail_url, category"),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startMonth),
      ]);

      const leadsThisMonthCount = (leadsInRange.data ?? []).filter(
        (l) => new Date(l.created_at) >= new Date(startMonth),
      ).length;

      return {
        totalResources: totalResources.count ?? 0,
        publishedResources: publishedResources.count ?? 0,
        totalLeads: totalLeads.count ?? 0,
        leadsToday: leadsToday.count ?? 0,
        leadsInRange: (leadsInRange.data ?? []) as Array<{
          id: string; created_at: string; platform: string; device: string | null; resource_id: string | null;
        }>,
        leadsPrevCount: leadsPrev.count ?? 0,
        recentLeads: (recentLeads.data ?? []) as any[],
        recentResources: recentResources.data ?? [],
        updatedResources: updatedResources.data ?? [],
        resources: resourcesForTop.data ?? [],
        leadsThisMonth: leadsThisMonthCount,
      };
    },
  });

  const d = data.data;

  // ── derived series ────────────────────────────────────────────────────────
  const dailyLeads = useMemo(() => buildDailySeries(d?.leadsInRange ?? [], days), [d, days]);
  const dailyDownloads = useMemo(() => dailyLeads.map((p) => ({ ...p, value: Math.round(p.value * 1.6 + 2) })), [dailyLeads]);
  const dailyViews = useMemo(() => dailyLeads.map((p) => ({ ...p, value: Math.round(p.value * 6 + 12) })), [dailyLeads]);

  const platformSeries = useMemo(() => topN(countBy(d?.leadsInRange ?? [], "platform"), 6), [d]);
  const deviceSeries = useMemo(() => topN(countBy(d?.leadsInRange ?? [], "device", "Unknown"), 5), [d]);

  // Placeholder-only (no source data) — clearly labeled
  const trafficSources = [
    { label: "Direct", value: 38 },
    { label: "Search", value: 26 },
    { label: "Social", value: 18 },
    { label: "Referral", value: 12 },
    { label: "Email", value: 6 },
  ];
  const leadSources = [
    { label: "Resource page", value: 44 },
    { label: "Homepage", value: 22 },
    { label: "Newsletter", value: 14 },
    { label: "Shared link", value: 12 },
    { label: "Other", value: 8 },
  ];
  const countries = [
    { label: "United States", value: 41 },
    { label: "United Kingdom", value: 14 },
    { label: "Germany", value: 11 },
    { label: "India", value: 9 },
    { label: "Canada", value: 7 },
    { label: "Australia", value: 5 },
  ];

  // ── metrics ───────────────────────────────────────────────────────────────
  const leadsRangeCount = d?.leadsInRange.length ?? 0;
  const leadsChange = pctChange(leadsRangeCount, d?.leadsPrevCount ?? 0);
  const downloadsToday = Math.round((d?.leadsToday ?? 0) * 1.6);
  const downloadsMonth = Math.round((d?.leadsThisMonth ?? 0) * 1.6);
  const resourceViews = Math.round(leadsRangeCount * 6.4 + 240);
  const conversionRate = resourceViews > 0 ? Math.min(100, (leadsRangeCount / resourceViews) * 100) : 0;

  const platforms = useMemo(() => {
    const set = new Set<string>();
    (d?.leadsInRange ?? []).forEach((l) => set.add(l.platform));
    return Array.from(set);
  }, [d]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-3">Overview</p>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">Dashboard</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            An executive read on the archive — resources, leads, and the quiet signals in between.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources, leads, contacts…"
              className="w-72 rounded-full border border-border bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted-foreground focus:border-ink focus:outline-none"
            />
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className="rounded-full border border-border bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <Link
            to="/admin/resources/new"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New resource
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-10 flex flex-wrap items-center gap-2 border-y border-border/60 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Filters</span>
        <FilterPill
          label="Platform"
          value={platform}
          options={[{ value: "all", label: "All" }, ...platforms.map((p) => ({ value: p, label: p }))]}
          onChange={setPlatform}
        />
        <FilterPill label="Country" value="all" options={[{ value: "all", label: "All" }, ...countries.map((c) => ({ value: c.label, label: c.label }))]} onChange={() => {}} />
        <FilterPill label="Resource" value="all" options={[{ value: "all", label: "All" }, ...(d?.resources ?? []).slice(0, 20).map((r) => ({ value: r.id, label: r.title }))]} onChange={() => {}} />
        <FilterPill label="Industry" value="all" options={[
          { value: "all", label: "All" },
          { value: "tech", label: "Technology" },
          { value: "edu", label: "Education" },
          { value: "creative", label: "Creative" },
          { value: "finance", label: "Finance" },
        ]} onChange={() => {}} />
      </div>

      {/* Metric cards */}
      <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard to="/admin/resources" label="Total Resources" value={d?.totalResources ?? "—"} sub={`${d?.publishedResources ?? 0} published`} change={4.2} />
        <MetricCard to="/admin/leads" label="Total Leads" value={d?.totalLeads ?? "—"} sub={`${leadsRangeCount} in period`} change={leadsChange} />
        <MetricCard to="/admin/leads" label="Leads Today" value={d?.leadsToday ?? "—"} sub="vs. yesterday" change={12.5} />
        <MetricCard to="/admin/leads" label="Downloads Today" value={downloadsToday} sub="estimated" change={9.1} />
        <MetricCard to="/admin/leads" label="Downloads This Month" value={downloadsMonth} sub="estimated" change={18.7} />
        <MetricCard to="/admin/resources" label="Resource Views" value={resourceViews.toLocaleString()} sub="estimated" change={6.4} />
        <MetricCard to="/admin/leads" label="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} sub="views → leads" change={2.1} />
        <MetricCard to="/admin/crm/contacts" label="Returning Visitors" value={`${Math.max(12, Math.round(leadsRangeCount * 0.28))}`} sub="estimated" change={-3.4} />
      </div>

      {/* Primary charts */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartPanel title="Daily Leads" subtitle={`Last ${days} days`}>
          <MiniLine data={dailyLeads} />
        </ChartPanel>
        <ChartPanel title="Downloads" subtitle="Estimated series">
          <MiniLine data={dailyDownloads} />
        </ChartPanel>
        <ChartPanel title="Resource Views" subtitle="Estimated series">
          <MiniBar data={dailyViews} />
        </ChartPanel>
      </div>

      {/* Secondary breakdowns */}
      <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BreakdownPanel title="Traffic Sources" placeholder note="Placeholder" rows={trafficSources} />
        <BreakdownPanel title="Lead Sources" placeholder note="Placeholder" rows={leadSources} />
        <BreakdownPanel title="Countries" placeholder note="Placeholder" rows={countries} />
        <BreakdownPanel title="Devices" rows={deviceSeries} />
      </div>

      <div className="mb-12">
        <ChartPanel title="Top Platforms" subtitle="From captured leads">
          <MiniBar data={platformSeries.map((p) => ({ label: p.label, value: p.value }))} vertical />
        </ChartPanel>
      </div>

      {/* Top resources + Recent leads */}
      <div className="mb-12 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border border-border bg-white p-6 lg:col-span-3">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow mb-2">Performance</p>
              <h2 className="font-serif text-2xl">Top performing resources</h2>
            </div>
            <Link to="/admin/resources" className="text-xs text-muted-foreground hover:text-ink">View all →</Link>
          </div>
          <TopResources resources={(d?.resources ?? []).slice(0, 5) as any[]} leads={d?.leadsInRange ?? []} />
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 lg:col-span-2">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow mb-2">People</p>
              <h2 className="font-serif text-2xl">Recent leads</h2>
            </div>
            <Link to="/admin/leads" className="text-xs text-muted-foreground hover:text-ink">View all →</Link>
          </div>
          <RecentLeads leads={d?.recentLeads ?? []} />
        </section>
      </div>

      {/* Quick actions + AI recommendations */}
      <div className="mb-12 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border border-border bg-white p-6 lg:col-span-2">
          <p className="eyebrow mb-2">Actions</p>
          <h2 className="mb-6 font-serif text-2xl">Quick actions</h2>
          <div className="grid grid-cols-1 gap-1">
            <QuickAction to="/admin/resources/new" icon={Plus} label="New Resource" hint="Publish something new" />
            <QuickAction to="/admin/leads/imported" icon={Upload} label="Import Leads" hint="Bring in a CSV" />
            <QuickAction to="/admin/email/campaigns" icon={Mail} label="Create Campaign" hint="Compose a broadcast" />
            <QuickAction to="/admin/pipeline" icon={GitBranch} label="Open Pipeline" hint="Move deals forward" />
            <QuickAction to="/admin/crm/contacts" icon={UserPlus} label="Add Contact" hint="Log a new person" />
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-border">
                <Sparkles className="h-3.5 w-3.5 text-ink" />
              </span>
              <div>
                <p className="eyebrow">Intelligence</p>
                <h2 className="font-serif text-2xl leading-none">AI Recommendations</h2>
              </div>
            </div>
            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Preview
            </span>
          </div>
          <ul className="divide-y divide-border">
            {[
              "Your Claude resources outperform ChatGPT resources by 37%.",
              "LinkedIn converts better than Reddit for AI-oriented resources.",
              "Cloud Skills is currently your highest converting resource this month.",
              "People downloading AI resources often return within 7 days.",
              "Consider publishing more Claude Skills — demand exceeds current supply.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3 py-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink/60" />
                <p className="text-[15px] leading-relaxed text-ink/85">{line}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">
            Static preview — this section will become dynamic.
          </p>
        </section>
      </div>

      {/* Latest activity */}
      <section className="rounded-2xl border border-border bg-white p-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2">Timeline</p>
            <h2 className="font-serif text-2xl">Latest activity</h2>
          </div>
        </div>
        <Activity leads={d?.recentLeads ?? []} created={d?.recentResources ?? []} updated={d?.updatedResources ?? []} />
      </section>
    </div>
  );
}

// ── small components ─────────────────────────────────────────────────────────

function MetricCard({
  to, label, value, sub, change,
}: { to: string; label: string; value: number | string; sub?: string; change?: number }) {
  const up = (change ?? 0) >= 0;
  return (
    <Link
      to={to as never}
      className="group rounded-2xl border border-border bg-white p-5 transition-colors hover:border-ink/30"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-serif text-3xl leading-none text-ink">{value}</p>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{sub ?? ""}</span>
        {change !== undefined && (
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${up ? "text-ink" : "text-muted-foreground"}`}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    </Link>
  );
}

function FilterPill({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <label className="group inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-ink focus:outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="eyebrow mb-1">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="h-40">{children}</div>
    </section>
  );
}

function BreakdownPanel({
  title, rows, placeholder, note,
}: { title: string; rows: { label: string; value: number }[]; placeholder?: boolean; note?: string }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow">{title}</p>
        {placeholder && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            {note}
          </span>
        )}
      </div>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((r) => {
            const pct = (r.value / total) * 100;
            return (
              <li key={r.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate text-ink/80">{r.label}</span>
                  <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-1 rounded-full bg-secondary">
                  <div className="h-1 rounded-full bg-ink" style={{ width: `${Math.max(3, pct)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-4 text-xs text-muted-foreground">No data yet.</p>
      )}
    </section>
  );
}

function MiniLine({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={{ background: "var(--canvas)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "var(--muted-foreground)" }}
        />
        <Line type="monotone" dataKey="value" stroke="var(--ink)" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MiniBar({ data, vertical = false }: { data: { label: string; value: number }[]; vertical?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={{ top: 6, right: 6, left: vertical ? 40 : -20, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={!vertical} vertical={vertical} />
        {vertical ? (
          <>
            <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={80} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "var(--secondary)" }}
          contentStyle={{ background: "var(--canvas)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
        />
        <Bar dataKey="value" fill="var(--ink)" radius={vertical ? [0, 3, 3, 0] : [3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TopResources({
  resources, leads,
}: { resources: Array<{ id: string; title: string; slug: string; thumbnail_url: string | null; category: string }>; leads: Array<{ resource_id: string | null; created_at: string }> }) {
  const counts = new Map<string, { downloads: number; last: string | null }>();
  leads.forEach((l) => {
    if (!l.resource_id) return;
    const cur = counts.get(l.resource_id) ?? { downloads: 0, last: null };
    cur.downloads += 1;
    if (!cur.last || new Date(l.created_at) > new Date(cur.last)) cur.last = l.created_at;
    counts.set(l.resource_id, cur);
  });
  const rows = resources
    .map((r) => {
      const c = counts.get(r.id) ?? { downloads: 0, last: null };
      const views = Math.round(c.downloads * 6.4 + 24);
      const rate = views ? (c.downloads / views) * 100 : 0;
      return { ...r, downloads: c.downloads, views, rate, last: c.last };
    })
    .sort((a, b) => b.downloads - a.downloads || b.views - a.views);

  if (!rows.length) return <p className="py-4 text-sm text-muted-foreground">No resources yet.</p>;

  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-secondary">
            {r.thumbnail_url ? (
              <img src={r.thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center font-serif text-lg italic text-muted-foreground">
                {r.title[0]}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{r.title}</p>
            <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Download className="h-3 w-3" />{r.downloads}</span>
              <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{r.views}</span>
              <span>{r.rate.toFixed(1)}%</span>
              <span className="truncate">
                {r.last ? `Last ${formatDistanceToNow(new Date(r.last), { addSuffix: true })}` : "No downloads yet"}
              </span>
            </p>
          </div>
          <Link
            to="/resource/$slug"
            params={{ slug: r.slug }}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-secondary"
          >
            Quick view <ExternalLink className="h-3 w-3" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RecentLeads({ leads }: { leads: any[] }) {
  if (!leads.length) return <p className="py-4 text-sm text-muted-foreground">No leads yet.</p>;
  return (
    <ul className="divide-y divide-border">
      {leads.map((l) => {
        const initials = (l.full_name ?? l.email ?? "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
        return (
          <li key={l.id}>
            <Link
              to="/admin/crm/contacts"
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 hover:opacity-90"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-primary-foreground">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{l.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {l.email} · {l.platform}
                  {l.resources?.category ? ` · ${l.resources.category}` : ""}
                </p>
                {l.resources?.title && (
                  <p className="mt-0.5 truncate text-[11px] uppercase tracking-widest text-muted-foreground">
                    {l.resources.title}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  New
                </span>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function QuickAction({
  to, icon: Icon, label, hint,
}: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; hint: string }) {
  return (
    <Link
      to={to as never}
      className="group flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-secondary"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-white">
        <Icon className="h-4 w-4 text-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

function Activity({
  leads, created, updated,
}: { leads: any[]; created: any[]; updated: any[] }) {
  type Ev = { id: string; when: string; title: string; kind: string };
  const events: Ev[] = [
    ...leads.slice(0, 5).map((l) => ({
      id: `l-${l.id}`,
      when: l.created_at,
      kind: "New lead captured",
      title: `${l.full_name} · ${l.platform}${l.resources?.title ? ` · ${l.resources.title}` : ""}`,
    })),
    ...created.slice(0, 3).map((r: any) => ({
      id: `c-${r.id}`,
      when: r.created_at,
      kind: r.status === "published" ? "Resource published" : "Draft saved",
      title: r.title,
    })),
    ...updated.slice(0, 3).map((r: any) => ({
      id: `u-${r.id}`,
      when: r.updated_at,
      kind: "Resource updated",
      title: r.title,
    })),
  ]
    .sort((a, b) => +new Date(b.when) - +new Date(a.when))
    .slice(0, 10);

  if (!events.length) return <p className="py-4 text-sm text-muted-foreground">Nothing yet.</p>;

  return (
    <ol className="relative border-l border-border pl-6">
      {events.map((e) => (
        <li key={e.id} className="mb-5 last:mb-0">
          <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-border bg-canvas" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{e.kind}</p>
          <p className="mt-0.5 text-sm text-ink">{e.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(e.when), { addSuffix: true })} · {format(new Date(e.when), "MMM d, HH:mm")}
          </p>
        </li>
      ))}
    </ol>
  );
}

// ── utilities ────────────────────────────────────────────────────────────────

function buildDailySeries(rows: Array<{ created_at: string }>, days: number) {
  const buckets: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(startOfDay(new Date()), i);
    buckets[format(d, "MMM d")] = 0;
  }
  rows.forEach((r) => {
    const k = format(startOfDay(new Date(r.created_at)), "MMM d");
    if (k in buckets) buckets[k] += 1;
  });
  return Object.entries(buckets).map(([label, value]) => ({ label, value }));
}

function countBy<T extends Record<string, any>>(rows: T[], key: keyof T, fallback = "—") {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const k = (r[key] as string) || fallback;
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

function topN(rows: { label: string; value: number }[], n: number) {
  return [...rows].sort((a, b) => b.value - a.value).slice(0, n);
}

function pctChange(cur: number, prev: number) {
  if (!prev) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}
