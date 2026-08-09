import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Users, Sparkles, Target, TrendingUp, Plus, Upload, Download } from "lucide-react";
import { adminLeadStats, adminExportLeads } from "@/lib/leads/admin.functions";
import { exportLeadsCsv } from "@/lib/leads/export";
import { STATUS_LABEL } from "@/lib/leads/taxonomy";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Command Center — Dock Owner Console" },
      { name: "description", content: "Executive overview of lead flow, sources and pipeline health inside Dock." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const RANGES = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: 0 },
] as const;

const PIE = ["var(--accent)", "#1c1c1b", "#8a8a84", "#c4c0b6", "#6b6b64", "#dcd8cf"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const statsFn = useServerFn(adminLeadStats);
  const exportFn = useServerFn(adminExportLeads);
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("30d");

  const from = useMemo(() => {
    const r = RANGES.find((x) => x.key === range)!;
    if (!r.days) return null;
    const d = new Date();
    d.setDate(d.getDate() - (r.days - 1));
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [range]);

  const q = useQuery({
    queryKey: ["admin", "lead-stats", range],
    queryFn: () => statsFn({ data: { from, to: null } }),
  });
  const s = q.data;

  async function downloadAll() {
    try {
      const rows = await exportFn({ data: { filters: {} } });
      if (!rows.length) { toast.info("No leads to export yet"); return; }
      exportLeadsCsv(rows as Record<string, unknown>[]);
      toast.success(`Exported ${rows.length} lead(s)`);
    } catch (e) { toast.error((e as Error).message); }
  }

  const delta = s ? s.today - s.yesterday : 0;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow mb-3">Command Center</p>
          <h1 className="font-serif text-4xl leading-[1.05] md:text-5xl">
            {greeting()}, Tayyab
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Here's what's happening inside Dock today — {format(new Date(), "EEEE, MMMM d")}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-border bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r.key ? "bg-ink text-primary-foreground" : "text-muted-foreground hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Link to="/admin/leads" search={{ new: true } as never} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Add lead
          </Link>
        </div>
      </header>

      {/* KPI cards */}
      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total leads"
          value={s?.total}
          loading={q.isLoading}
          icon={Users}
          hint={s ? `${s.month} added this month` : undefined}
        />
        <Kpi
          label="New today"
          value={s?.today}
          loading={q.isLoading}
          icon={Sparkles}
          hint={s ? (delta === 0 ? "Same as yesterday" : `${delta > 0 ? "+" : ""}${delta} vs yesterday`) : undefined}
          trend={delta}
        />
        <Kpi label="Qualified" value={s?.qualified} loading={q.isLoading} icon={Target} hint={s ? `${s.converted} converted` : undefined} />
        <Kpi
          label="Conversion rate"
          value={s ? `${s.conversionRate}%` : undefined}
          loading={q.isLoading}
          icon={TrendingUp}
          hint={s?.total ? "Converted / total leads" : "Not tracked yet"}
        />
      </section>

      {/* Activity chart */}
      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Lead activity" subtitle="Leads captured per day">
          <div className="h-[280px] w-full px-1 pb-2">
            {q.isLoading ? (
              <Skeleton className="h-full" />
            ) : !s?.series.length ? (
              <Empty label="Not tracked yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={s.series} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => format(parseISO(v), "MMM d")}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                    labelFormatter={(v) => format(parseISO(String(v)), "EEEE, MMM d")}
                  />
                  <Area type="monotone" dataKey="leads" stroke="var(--accent)" strokeWidth={2} fill="url(#leadFill)" name="Leads" />
                  <Area type="monotone" dataKey="qualified" stroke="#1c1c1b" strokeWidth={1.5} fillOpacity={0} name="Qualified" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Leads by source" subtitle="Where your leads come from">
          <Donut data={s?.bySource ?? []} loading={q.isLoading} />
        </Panel>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Leads by industry" subtitle="Top verticals">
          <Bars data={s?.byIndustry ?? []} loading={q.isLoading} />
        </Panel>

        <Panel title="Pipeline status" subtitle="Distribution across stages">
          <Bars
            data={(s?.byStatus ?? []).map((r) => ({ label: STATUS_LABEL[r.label] ?? r.label, count: r.count }))}
            loading={q.isLoading}
          />
        </Panel>

        <Panel
          title="Recent leads"
          subtitle="Latest captures"
          action={<Link to="/admin/leads" search={{}} className="text-xs text-muted-foreground hover:text-ink">View all</Link>}
        >
          {q.isLoading ? (
            <div className="space-y-2 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : !s?.recent.length ? (
            <Empty label="No leads yet" />
          ) : (
            <ul className="divide-y divide-border">
              {s.recent.map((r) => (
                <li key={r.id}>
                  <Link to="/admin/leads/$id" params={{ id: r.id }} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/40">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                      {(r.full_name || r.email || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.full_name || r.email}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.business_name || r.industry || r.email}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* Quick actions */}
      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickAction to="/admin/leads" search={{ new: true }} icon={Plus} title="Add a lead" desc="Capture a contact manually" />
        <QuickAction to="/admin/leads/import" icon={Upload} title="Import leads" desc="Upload CSV or Excel with mapping" />
        <button
          onClick={() => void downloadAll()}
          className="group flex items-start gap-3 rounded-2xl border border-border bg-white p-5 text-left transition-shadow hover:shadow-[0_12px_40px_-28px_rgba(28,28,27,0.5)]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary/50">
            <Download className="h-4 w-4" />
          </span>
          <span>
            <span className="flex items-center gap-1 text-sm font-medium">Export all leads <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" /></span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Download a complete CSV</span>
          </span>
        </button>
      </section>
    </div>
  );
}

function QuickAction({ to, search, icon: Icon, title, desc }: {
  to: string; search?: Record<string, unknown>; icon: React.ComponentType<{ className?: string }>; title: string; desc: string;
}) {
  return (
    <Link
      to={to as never}
      search={(search ?? {}) as never}
      className="group flex items-start gap-3 rounded-2xl border border-border bg-white p-5 transition-shadow hover:shadow-[0_12px_40px_-28px_rgba(28,28,27,0.5)]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary/50">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="flex items-center gap-1 text-sm font-medium">{title} <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" /></span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
      </span>
    </Link>
  );
}

function Kpi({ label, value, hint, loading, icon: Icon, trend }: {
  label: string; value?: number | string; hint?: string; loading: boolean;
  icon: React.ComponentType<{ className?: string }>; trend?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-[0_1px_2px_rgba(28,28,27,0.03)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/[0.07] blur-2xl" />
      <div className="relative flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-secondary/40">
          <Icon className="h-3.5 w-3.5 text-ink/60" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="relative mt-4 h-9 w-24" />
      ) : (
        <p className="relative mt-3 font-serif text-4xl leading-none">{value ?? "—"}</p>
      )}
      {hint && !loading && (
        <p className={`relative mt-2 text-xs ${trend && trend > 0 ? "text-accent" : "text-muted-foreground"}`}>{hint}</p>
      )}
    </div>
  );
}

function Panel({ title, subtitle, action, children, className = "" }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-white ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-serif text-lg leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Bars({ data, loading }: { data: { label: string; count: number }[]; loading: boolean }) {
  if (loading) return <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-6" />)}</div>;
  if (!data.length) return <Empty label="Not tracked yet" />;
  const max = Math.max(...data.map((d) => d.count));
  return (
    <ul className="space-y-3 p-5">
      {data.slice(0, 6).map((d) => (
        <li key={d.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{d.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{d.count}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.max(4, (d.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Donut({ data, loading }: { data: { label: string; count: number }[]; loading: boolean }) {
  if (loading) return <div className="p-5"><Skeleton className="h-[220px]" /></div>;
  if (!data.length) return <Empty label="Not tracked yet" />;
  const top = data.slice(0, 6);
  return (
    <div className="p-4">
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={top} dataKey="count" nameKey="label" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
              {top.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 space-y-1.5 px-1">
        {top.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PIE[i % PIE.length] }} />
            <span className="truncate">{d.label}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-secondary/70 ${className}`} />;
}

function Empty({ label }: { label: string }) {
  return <p className="px-5 py-14 text-center text-sm text-muted-foreground">{label}</p>;
}