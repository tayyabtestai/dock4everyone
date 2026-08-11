import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Compass,
  Wallet,
  Bot,
  Swords,
  Map as MapIcon,
  ClipboardCheck,
  Flag,
  Sparkles,
  DollarSign,
  Clock,
  TrendingUp,
  Target,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CalendarClock,
  Headset,
  Phone,
  Database,
  Mail,
  PieChart,
  Settings2,
  Check,
  Info,
  type LucideIcon,
} from "lucide-react";
import { getReport } from "@/lib/funnels/public.functions";
import { formatOutput } from "@/lib/funnels/engine";
import type { ReportModel, AiSystem, WorkloadItem } from "@/lib/funnels/report";

const reportQuery = (id: string) =>
  queryOptions({
    queryKey: ["report", id],
    queryFn: () => getReport({ data: { id } }),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/report/$id")({
  loader: async ({ params, context }) => {
    const r = await context.queryClient.ensureQueryData(reportQuery(params.id));
    if (!r) throw notFound();
    return r;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.reportTitle} — Dock` : "Report — Dock" }],
  }),
  notFoundComponent: () => (
    <div className="console grid min-h-dvh place-items-center bg-canvas px-6 text-center text-ink">
      <div>
        <p className="eyebrow mb-2 text-accent">Report unavailable</p>
        <h1 className="font-serif text-3xl">We couldn’t find that report.</h1>
        <Link to="/" className="mt-5 inline-block text-sm text-accent hover:underline">
          Return home
        </Link>
      </div>
    </div>
  ),
  component: ReportPage,
});

type SectionKey =
  | "overview"
  | "opportunity"
  | "workload"
  | "ai-systems"
  | "competitive"
  | "roadmap"
  | "recommended"
  | "next-steps";

const NAV: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "opportunity", label: "Opportunity", icon: Compass },
  { key: "workload", label: "Workload & ROI", icon: Wallet },
  { key: "ai-systems", label: "AI Systems", icon: Bot },
  { key: "competitive", label: "Competitive Gap", icon: Swords },
  { key: "roadmap", label: "Implementation Roadmap", icon: MapIcon },
  { key: "recommended", label: "Recommended Assessments", icon: ClipboardCheck },
  { key: "next-steps", label: "Next Steps", icon: Flag },
];

function ReportPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(reportQuery(id));
  const m = data!;
  const [active, setActive] = useState<SectionKey>("overview");

  useEffect(() => {
    const h = window.location.hash.replace("#", "") as SectionKey;
    if (h && NAV.some((n) => n.key === h)) setActive(h);
  }, []);

  function go(key: SectionKey) {
    setActive(key);
    history.replaceState(null, "", `#${key}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="console min-h-dvh bg-canvas text-ink">
      <div className="mx-auto flex max-w-[1560px]">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-dvh w-[280px] shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
          <div className="flex items-center gap-2.5 px-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">AI Automation</p>
              <p className="text-xs text-muted-foreground">Opportunity Report</p>
            </div>
          </div>

          <nav className="mt-7 flex-1 space-y-1">
            {NAV.map((n) => {
              const on = active === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => go(n.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    on
                      ? "bg-accent/10 font-medium text-accent"
                      : "text-muted-foreground hover:bg-secondary hover:text-ink"
                  }`}
                >
                  <n.icon className="h-4.5 w-4.5 shrink-0" />
                  {n.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-4">
            <Sparkles className="h-5 w-5 text-accent" />
            <p className="mt-2 text-sm font-medium">Ready to turn insights into automation?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Book a strategy call with our AI automation experts.
            </p>
            <a
              href={m.nextSteps.primary.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-ink px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Calendar className="h-3.5 w-3.5" /> Book Strategy Call
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-5 py-6 sm:px-7 lg:px-10 lg:py-9">
          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="order-2 rounded-xl border border-border bg-card px-4 py-2 sm:order-1">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Report Prepared For
              </p>
              <p className="text-sm font-semibold">
                {m.contactName} • {m.company}
              </p>
            </div>
            <span className="order-1 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium sm:order-2">
              <Sparkles className="h-4 w-4 text-accent" /> {m.funnelName}
            </span>
          </div>

          {/* Mobile section tabs */}
          <div className="mt-4 -mx-5 overflow-x-auto px-5 lg:hidden">
            <div className="flex gap-2">
              {NAV.map((n) => (
                <button
                  key={n.key}
                  onClick={() => go(n.key)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active === n.key
                      ? "bg-accent text-accent-foreground"
                      : "border border-border bg-card text-muted-foreground"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            {active === "overview" && <Overview m={m} onNav={go} />}
            {active === "opportunity" && <Opportunity m={m} />}
            {active === "workload" && <WorkloadRoi m={m} />}
            {active === "ai-systems" && <AiSystems m={m} />}
            {active === "competitive" && <Competitive m={m} />}
            {active === "roadmap" && <Roadmap m={m} />}
            {active === "recommended" && <Recommended m={m} />}
            {active === "next-steps" && <NextSteps m={m} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================= shared ================= */

const KPI_ICON: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  dollar: DollarSign,
  clock: Clock,
  trend: TrendingUp,
  target: Target,
};

function PageHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-serif text-3xl leading-tight md:text-4xl">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
    </header>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 font-serif text-xl">{children}</h2>;
}

function LevelBadge({ level }: { level: string }) {
  const tone = /very high/i.test(level)
    ? "bg-[var(--chart-5)]/15 text-[var(--chart-5)]"
    : /high/i.test(level)
      ? "bg-accent/12 text-accent"
      : /moderate/i.test(level)
        ? "bg-[var(--chart-4)]/15 text-[var(--chart-4)]"
        : "bg-secondary text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      {level}
    </span>
  );
}

/** Segmented semicircle score arc. */
function ArcGauge({ score, label }: { score: number; label: string }) {
  const segments = 40;
  const filled = Math.round((score / 100) * segments);
  const cx = 130;
  const cy = 130;
  const rOuter = 118;
  const rInner = 92;
  // Round coordinates so server- and client-rendered SVG strings match exactly
  // (avoids an SSR hydration mismatch from floating-point formatting).
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return (
    <div className="relative mx-auto w-[260px]">
      <svg viewBox="0 0 260 150" className="w-full">
        {Array.from({ length: segments }).map((_, i) => {
          const a = Math.PI - (i + 0.5) * (Math.PI / segments);
          const on = i < filled;
          const x1 = r2(cx + rInner * Math.cos(a));
          const y1 = r2(cy - rInner * Math.sin(a));
          const x2 = r2(cx + rOuter * Math.cos(a));
          const y2 = r2(cy - rOuter * Math.sin(a));
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={on ? "url(#arcgrad)" : "var(--border)"}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={on ? 1 : 0.7}
            />
          );
        })}
        <defs>
          <linearGradient id="arcgrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <div className="font-serif text-5xl leading-none">{score}</div>
        <div className="mt-1 text-sm font-medium text-[var(--chart-5)]">{label}</div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  nodata,
  positive,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  nodata?: boolean;
  positive?: boolean;
}) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      <p
        className={`mt-3 font-serif text-[32px] leading-none ${nodata ? "text-muted-foreground" : positive ? "text-[var(--chart-5)]" : "text-ink"}`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

const WL_ICON: Record<string, LucideIcon> = {
  "Appointment Handling": CalendarClock,
  "Customer Support": Headset,
  "Phone Calls": Phone,
  "CRM / Data Entry": Database,
  "Follow-ups": Mail,
  Reporting: PieChart,
  "Internal Workflows": Settings2,
  "Lead Qualification": Target,
};

function WorkloadRows({ items }: { items: WorkloadItem[] }) {
  if (!items.length)
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No operational workload was captured for this assessment.
      </p>
    );
  return (
    <div className="space-y-3.5">
      {items.map((w) => {
        const Icon = WL_ICON[w.label] ?? Settings2;
        return (
          <div key={w.key} className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <span className="w-36 shrink-0 truncate text-sm">{w.label}</span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="h-2 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-[var(--chart-1)]"
                  style={{ width: `${w.pct}%` }}
                />
              </div>
              <div className="h-1.5 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-[var(--chart-4)]/70"
                  style={{ width: `${w.impact}%` }}
                />
              </div>
            </div>
            <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
              {w.pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ================= sections ================= */

function Overview({ m, onNav }: { m: ReportModel; onNav: (k: SectionKey) => void }) {
  return (
    <div>
      <PageHead
        title="Overview"
        subtitle={`Your personalized AI automation opportunity at a glance — prepared for ${m.company}.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {m.kpis.map((k) => (
          <KpiCard
            key={k.key}
            icon={KPI_ICON[k.icon] ?? Sparkles}
            label={k.label}
            value={k.value}
            sub={k.sub}
            nodata={k.state === "nodata"}
            positive={k.tone === "positive"}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle>Your Automation Opportunity Score</CardTitle>
          <ArcGauge score={m.score.value} label={m.score.band} />
          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            {m.scoreBreakdown.map((d) => (
              <div key={d.label}>
                <p className="font-serif text-2xl">{d.value}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{d.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-accent/20 bg-accent/5 p-3 text-sm">
            <Sparkles className="mb-1 inline h-4 w-4 text-accent" />{" "}
            <span className="text-muted-foreground">{m.scoreNarrative}</span>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Your Current Operational Workload</CardTitle>
          </div>
          <WorkloadRows items={m.workload} />
          <p className="mt-4 text-xs text-muted-foreground">
            Based on the processes and time you identified.
          </p>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle>Estimated Financial Impact</CardTitle>
          {m.financial ? (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1 rounded-xl border border-border bg-secondary/30 p-4 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Estimated Monthly Labor Cost
                  </p>
                  <p className="mt-1 font-serif text-3xl">
                    {formatOutput(m.financial.monthlyLaborCost, "currency")}
                  </p>
                  <p className="text-xs text-muted-foreground">Current State</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 rounded-xl border border-[var(--chart-5)]/30 bg-[var(--chart-5)]/5 p-4 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Estimated Monthly Savings
                  </p>
                  <p className="mt-1 font-serif text-3xl text-[var(--chart-5)]">
                    {formatOutput(m.financial.monthlySavings, "currency")}
                  </p>
                  <p className="text-xs text-muted-foreground">With Automation</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-[var(--chart-5)]/8 px-4 py-2.5 text-center text-sm">
                Estimated Annual Savings:{" "}
                <span className="font-semibold text-[var(--chart-5)]">
                  {formatOutput(m.financial.annualSavings, "currency")}
                </span>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Estimates based on the information you provided, not guaranteed results.
              </p>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Not enough data to estimate financial impact. This assessment didn’t collect workload
              numbers.
            </p>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Your Biggest Opportunities</CardTitle>
            <button
              onClick={() => onNav("ai-systems")}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              View All <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <ul className="space-y-3">
            {m.biggestOpportunities.map((o) => (
              <li key={o.rank} className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-semibold">
                  {o.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{o.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{o.desc}</p>
                </div>
                <LevelBadge level={o.impact} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Opportunity({ m }: { m: ReportModel }) {
  return (
    <div>
      <PageHead
        title="Opportunity"
        subtitle="Where your business has the greatest automation potential."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardTitle>Overall Opportunity</CardTitle>
          <ArcGauge score={m.score.value} label={m.score.band} />
        </Card>
        <Card>
          <CardTitle>Automation-Readiness Breakdown</CardTitle>
          <div className="space-y-4">
            {m.scoreBreakdown.map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{d.label}</span>
                  <span className="font-semibold tabular-nums">{d.value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    style={{ width: `${d.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-5">
        <Card>
          <CardTitle>Priority Opportunities</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {m.aiSystems.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-4"
              >
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">Priority #{s.priority}</p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-xl">{s.score}</p>
                  <LevelBadge level={s.level} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function WorkloadRoi({ m }: { m: ReportModel }) {
  return (
    <div>
      <PageHead
        title="Workload & ROI"
        subtitle="Financial and operational impact calculated from your actual answers."
      />
      {m.financial ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <KpiCard
              icon={DollarSign}
              label="Monthly Labor Cost"
              value={formatOutput(m.financial.monthlyLaborCost, "currency")}
              sub="Current state"
            />
            <KpiCard
              icon={Wallet}
              label="Monthly Savings"
              value={formatOutput(m.financial.monthlySavings, "currency")}
              sub="Estimated"
              positive
            />
            <KpiCard
              icon={TrendingUp}
              label="Annual Savings"
              value={formatOutput(m.financial.annualSavings, "currency")}
              sub="Estimated"
              positive
            />
          </div>
          {m.outputs.length > 0 && (
            <div className="mt-5">
              <Card>
                <CardTitle>Calculated Impact</CardTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  {m.outputs.map((o) => (
                    <div
                      key={o.key}
                      className="rounded-xl border border-border bg-secondary/20 p-4"
                    >
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {o.label}
                      </p>
                      <p className="mt-1 font-serif text-2xl">{formatOutput(o.value, o.format)}</p>
                      {o.period ? (
                        <p className="text-xs text-muted-foreground">{o.period}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            All figures are estimates based on the information you provided, not guaranteed results.
          </p>
        </>
      ) : (
        <Card>
          <p className="py-10 text-center text-sm text-muted-foreground">
            This assessment didn’t collect the workload numbers (employees, hours, hourly cost)
            needed to estimate ROI. Take the ROI Calculator to quantify your opportunity.
          </p>
        </Card>
      )}
    </div>
  );
}

const SYS_ICON: Record<string, LucideIcon> = {
  appointment: CalendarClock,
  voice: Phone,
  support: Headset,
  crm: Database,
  leadqual: Target,
  followup: Mail,
};

function AiSystems({ m }: { m: ReportModel }) {
  return (
    <div>
      <PageHead title="AI Systems" subtitle="Recommended AI systems based on your responses." />
      <div className="space-y-4">
        {m.aiSystems.map((s: AiSystem) => {
          const Icon = SYS_ICON[s.key] ?? Bot;
          return (
            <Card key={s.key}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-xl">{s.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Opportunity Score {s.score}/100
                      </span>
                      <LevelBadge level={s.level} />
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                  Priority #{s.priority}
                </span>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{s.why}</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    What it can automate
                  </p>
                  <ul className="space-y-1.5">
                    {s.automates.map((a) => (
                      <li key={a} className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--chart-5)]" /> {a}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-2 self-start">
                  <Stat label="Potential Impact" value={s.impact} />
                  <Stat label="Complexity" value={s.complexity} />
                  <Stat label="Priority" value={`#${s.priority}`} />
                  <Stat label="Opportunity" value={`${s.score}/100`} />
                </div>
              </div>

              <a
                href={s.cta.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Calendar className="h-4 w-4" /> {s.cta.text}
              </a>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function Competitive({ m }: { m: ReportModel }) {
  const c = m.competitive;
  return (
    <div>
      <PageHead title="Your Competitive Automation Gap" subtitle={c.intro} />
      <Card>
        <CardTitle>Your business today vs. an AI-enabled operating model</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Capability</th>
                <th className="py-2 pr-4">Your current state</th>
                <th className="py-2">AI-enabled benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {c.capabilities.map((r) => (
                <tr key={r.capability}>
                  <td className="py-3 pr-4 font-medium">{r.capability}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{r.current}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-[var(--chart-5)]/12 px-2.5 py-0.5 text-xs font-medium text-[var(--chart-5)]">
                      {r.benchmark}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Your current process
          </p>
          <FlowChain steps={c.currentProcess} tone="muted" />
        </Card>
        <Card>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Potential automated process
          </p>
          <FlowChain steps={c.automatedProcess} tone="accent" />
        </Card>
      </div>

      <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center">
        <p className="mx-auto max-w-2xl font-serif text-lg leading-snug">{c.closing}</p>
      </div>
    </div>
  );
}

function FlowChain({ steps, tone }: { steps: string[]; tone: "muted" | "accent" }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span
            className={`rounded-lg px-3 py-1.5 text-sm ${tone === "accent" ? "bg-accent/12 text-accent" : "bg-secondary text-muted-foreground"}`}
          >
            {s}
          </span>
          {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

function Roadmap({ m }: { m: ReportModel }) {
  return (
    <div>
      <PageHead
        title="Your 90-Day Automation Roadmap"
        subtitle="What to implement first, based on your recommended systems."
      />
      <div className="grid gap-5 lg:grid-cols-3">
        {m.roadmap.map((p, i) => (
          <Card key={p.title}>
            <span className="inline-flex rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
              {p.weeks}
            </span>
            <h3 className="mt-3 font-serif text-xl">{p.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {p.items.map((it) => (
                <li key={it} className="flex items-center gap-2.5 text-sm">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-semibold">
                    {i + 1}
                  </span>
                  {it}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Recommended({ m }: { m: ReportModel }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div>
      <PageHead
        title="Recommended Assessments"
        subtitle="Based on your answers, these assessments may reveal more opportunity."
      />
      {m.recommendedFunnels.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {m.recommendedFunnels.map((r) => (
            <Card key={r.slug}>
              <h3 className="font-serif text-lg">{r.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{r.reason}</p>
              <a
                href={`${origin}/funnel/${r.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-primary-foreground"
              >
                {r.label} <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No further assessments are recommended right now.
          </p>
        </Card>
      )}
    </div>
  );
}

function NextSteps({ m }: { m: ReportModel }) {
  return (
    <div>
      <PageHead title="Next Steps" subtitle="Turn these opportunities into working systems." />
      <div className="rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/8 to-transparent p-8 text-center">
        <Flag className="mx-auto h-7 w-7 text-accent" />
        <h2 className="mx-auto mt-4 max-w-xl font-serif text-3xl leading-tight">
          {m.nextSteps.headline}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{m.nextSteps.body}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={m.nextSteps.primary.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Calendar className="h-4 w-4" /> {m.nextSteps.primary.text}
          </a>
          <Link
            to="/resources"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-secondary"
          >
            {m.nextSteps.secondary.text} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" /> This report was generated from your assessment responses.
      </p>
    </div>
  );
}
