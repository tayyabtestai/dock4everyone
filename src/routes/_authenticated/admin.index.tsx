import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import {
  Search,
  Plus,
  Upload,
  Mail,
  GitBranch,
  UserPlus,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileText,
  UserCircle2,
  AlertCircle,
  Command,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

const ADMIN_NAME = "Tayyab";

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type Lead = {
  id: string;
  full_name: string;
  email: string;
  platform: string;
  device: string | null;
  created_at: string;
  resource_id: string | null;
  resources?: { title: string; category: string } | null;
};

type Resource = {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft" | string;
  category: string;
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
  external_url: string | null;
};

function Dashboard() {
  const [now, setNow] = useState(() => new Date());
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = useQuery({
    queryKey: ["admin", "dashboard-command"],
    queryFn: async () => {
      const today = startOfLocalDay().toISOString();
      const yesterday = new Date(startOfLocalDay().getTime() - 86_400_000).toISOString();

      const [
        totalResources,
        draftResources,
        totalLeads,
        leadsTodayCount,
        leadsYesterdayCount,
        recentLeads,
        recentResources,
      ] = await Promise.all([
        supabase.from("resources").select("id", { count: "exact", head: true }),
        supabase.from("resources").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .gte("created_at", yesterday)
          .lt("created_at", today),
        supabase
          .from("leads")
          .select("id, full_name, email, platform, device, created_at, resource_id, resources(title, category)")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("resources")
          .select("id, title, slug, status, category, created_at, updated_at, thumbnail_url, external_url")
          .order("updated_at", { ascending: false })
          .limit(6),
      ]);

      setLastSync(new Date());

      return {
        totalResources: totalResources.count ?? 0,
        draftResources: draftResources.count ?? 0,
        totalLeads: totalLeads.count ?? 0,
        leadsToday: leadsTodayCount.count ?? 0,
        leadsYesterday: leadsYesterdayCount.count ?? 0,
        recentLeads: (recentLeads.data ?? []) as Lead[],
        recentResources: (recentResources.data ?? []) as Resource[],
      };
    },
  });

  const d = q.data;
  const hasAnyData = !!d && (d.totalLeads > 0 || d.totalResources > 0);

  const leadsDelta = useMemo(() => {
    if (!d) return null;
    const diff = d.leadsToday - d.leadsYesterday;
    return { diff, base: d.leadsYesterday };
  }, [d]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      {/* Header */}
      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-3">Command Center</p>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">
            {greeting(now)}, {ADMIN_NAME}.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">
            Here's what's happening inside Dock today.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 text-xs text-muted-foreground md:items-end">
          <button
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center gap-3 rounded-full border border-border bg-white px-4 py-2 text-sm text-ink/70 hover:border-ink/30 hover:text-ink"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search Dock</span>
            <span className="ml-2 inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Command className="h-2.5 w-2.5" /> K
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span>{format(now, "EEEE, MMMM d")}</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>
              {lastSync ? `Synced ${formatDistanceToNow(lastSync, { addSuffix: true })}` : "Syncing…"}
            </span>
          </div>
        </div>
      </header>

      {/* Top overview */}
      <section className="mb-14">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard
            to="/admin/resources"
            label="Total Resources"
            value={d?.totalResources}
            hint={d ? `${d.totalResources - d.draftResources} published` : undefined}
          />
          <MetricCard to="/admin/leads" label="Total Leads" value={d?.totalLeads} />
          <MetricCard
            to="/admin/leads"
            label="New Leads Today"
            value={d?.leadsToday}
            delta={leadsDelta ?? undefined}
          />
          <MetricCard to="/admin/leads" label="Downloads Today" value={undefined} note="Not tracked yet" />
          <MetricCard
            to="/admin/email/campaigns"
            label="Active Email Campaigns"
            value={undefined}
            note="Not tracked yet"
          />
          <MetricCard to="/admin/pipeline" label="Pipeline Leads" value={undefined} note="Not tracked yet" />
          <MetricCard
            to="/admin/analytics"
            label="Conversion Rate"
            value={undefined}
            note="Awaiting view data"
          />
          <MetricCard
            to="/admin/resources/drafts"
            label="Draft Resources"
            value={d?.draftResources}
          />
        </div>
      </section>

      {/* Mission Control + Needs Attention */}
      <div className="mb-14 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-border bg-white p-8 lg:col-span-3">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="eyebrow mb-2">Mission Control</p>
              <h2 className="font-serif text-3xl leading-tight">Today's brief.</h2>
            </div>
            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Live
            </span>
          </div>

          {!hasAnyData ? (
            <EmptyLine
              title="The archive is quiet."
              body="Once resources are published and leads start arriving, your daily briefing will appear here — a concise, editorial read on what changed overnight."
            />
          ) : (
            <ul className="divide-y divide-border">
              {d && (
                <BriefRow>
                  <strong className="font-medium text-ink">{d.leadsToday}</strong>{" "}
                  {d.leadsToday === 1 ? "lead" : "leads"} arrived today
                  {leadsDelta && d.leadsYesterday > 0 ? (
                    <>
                      {" "}— {leadsDelta.diff >= 0 ? "up" : "down"}{" "}
                      {Math.abs(leadsDelta.diff)} vs. yesterday.
                    </>
                  ) : (
                    "."
                  )}
                </BriefRow>
              )}
              {d && d.totalLeads > 0 && (
                <BriefRow>
                  <strong className="font-medium text-ink">{d.totalLeads}</strong> total{" "}
                  {d.totalLeads === 1 ? "lead" : "leads"} captured to date across{" "}
                  <strong className="font-medium text-ink">{d.totalResources}</strong>{" "}
                  {d.totalResources === 1 ? "resource" : "resources"}.
                </BriefRow>
              )}
              {d && d.draftResources > 0 && (
                <BriefRow>
                  <strong className="font-medium text-ink">{d.draftResources}</strong>{" "}
                  {d.draftResources === 1 ? "resource remains" : "resources remain"} in draft, waiting to
                  be published.
                </BriefRow>
              )}
              {d && d.totalResources > 0 && d.totalLeads === 0 && (
                <BriefRow>
                  Resources are live, but no leads have been captured yet. Consider sharing an entry to
                  test the flow.
                </BriefRow>
              )}
            </ul>
          )}

          <div className="mt-8 flex justify-end">
            <Link
              to="/admin/analytics"
              className="text-xs font-medium text-ink/70 underline-offset-4 hover:text-ink hover:underline"
            >
              View full analytics →
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-8 lg:col-span-2">
          <div className="mb-6">
            <p className="eyebrow mb-2">Needs Attention</p>
            <h2 className="font-serif text-3xl leading-tight">Open items.</h2>
          </div>
          <NeedsAttention drafts={d?.draftResources ?? 0} hasData={hasAnyData} />
        </section>
      </div>

      {/* Recent Leads */}
      <section className="mb-14 rounded-2xl border border-border bg-white p-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2">People</p>
            <h2 className="font-serif text-3xl leading-tight">Recent leads.</h2>
          </div>
          <Link to="/admin/leads" className="text-xs text-muted-foreground hover:text-ink">
            View all →
          </Link>
        </div>
        <RecentLeadsTable leads={d?.recentLeads ?? []} loading={q.isLoading} />
      </section>

      {/* Recent Resources + Upcoming */}
      <div className="mb-14 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-border bg-white p-8 lg:col-span-3">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="eyebrow mb-2">Library</p>
              <h2 className="font-serif text-3xl leading-tight">Recent resources.</h2>
            </div>
            <Link to="/admin/resources" className="text-xs text-muted-foreground hover:text-ink">
              View all →
            </Link>
          </div>
          <RecentResources resources={d?.recentResources ?? []} loading={q.isLoading} />
        </section>

        <section className="rounded-2xl border border-border bg-white p-8 lg:col-span-2">
          <div className="mb-6">
            <p className="eyebrow mb-2">Upcoming</p>
            <h2 className="font-serif text-3xl leading-tight">Scheduled.</h2>
          </div>
          <EmptyLine
            title="Nothing scheduled."
            body="Scheduled campaigns, publishes and follow-ups will appear here in chronological order."
          />
        </section>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="mb-14 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-border bg-white p-8 lg:col-span-3">
          <div className="mb-6">
            <p className="eyebrow mb-2">Timeline</p>
            <h2 className="font-serif text-3xl leading-tight">Recent activity.</h2>
          </div>
          <ActivityTimeline
            leads={d?.recentLeads ?? []}
            resources={d?.recentResources ?? []}
            loading={q.isLoading}
          />
        </section>

        <section className="rounded-2xl border border-border bg-white p-8 lg:col-span-2">
          <div className="mb-6">
            <p className="eyebrow mb-2">Actions</p>
            <h2 className="font-serif text-3xl leading-tight">Quick actions.</h2>
          </div>
          <div className="grid grid-cols-1 gap-1">
            <QuickAction to="/admin/resources/new" icon={Plus} label="New Resource" />
            <QuickAction to="/admin/leads/imported" icon={Upload} label="Import Leads" />
            <QuickAction to="/admin/email/campaigns" icon={Mail} label="Create Campaign" />
            <QuickAction to="/admin/crm/contacts" icon={UserPlus} label="Add Contact" />
            <QuickAction to="/admin/pipeline" icon={GitBranch} label="Open Pipeline" />
            <QuickAction to="/admin/analytics" icon={BarChart3} label="View Analytics" />
          </div>
        </section>
      </div>

      {searchOpen && (
        <CommandSearch
          onClose={() => setSearchOpen(false)}
          resources={d?.recentResources ?? []}
          leads={d?.recentLeads ?? []}
        />
      )}
    </div>
  );
}

/* ──────────────────────── UI pieces ──────────────────────── */

function MetricCard({
  to,
  label,
  value,
  hint,
  note,
  delta,
}: {
  to: string;
  label: string;
  value: number | undefined;
  hint?: string;
  note?: string;
  delta?: { diff: number; base: number };
}) {
  const showValue = typeof value === "number";
  return (
    <Link
      to={to as never}
      className="group rounded-2xl border border-border bg-white p-5 transition-colors hover:border-ink/30"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-4 font-serif text-4xl leading-none text-ink">
        {showValue ? value!.toLocaleString() : <span className="text-ink/25">—</span>}
      </p>
      <div className="mt-5 flex min-h-[18px] items-center justify-between text-xs">
        <span className="text-muted-foreground">{note ?? hint ?? ""}</span>
        {delta && showValue && (
          <DeltaBadge diff={delta.diff} base={delta.base} />
        )}
      </div>
    </Link>
  );
}

function DeltaBadge({ diff, base }: { diff: number; base: number }) {
  if (base === 0 && diff === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1 text-ink/70">
      <Icon className="h-3 w-3" />
      {diff > 0 ? "+" : ""}
      {diff} vs. yest.
    </span>
  );
}

function BriefRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-4 py-4">
      <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ink/50" />
      <p className="text-[15px] leading-relaxed text-ink/80">{children}</p>
    </li>
  );
}

function NeedsAttention({ drafts, hasData }: { drafts: number; hasData: boolean }) {
  const items: { title: string; body: string; to: string }[] = [];
  if (drafts > 0) {
    items.push({
      title: `${drafts} draft ${drafts === 1 ? "resource" : "resources"} unpublished`,
      body: "Review and publish, or archive the ones you're not shipping.",
      to: "/admin/resources/drafts",
    });
  }
  if (!hasData) {
    items.push({
      title: "No resources yet",
      body: "Publish your first entry to open the archive.",
      to: "/admin/resources/new",
    });
  }

  if (items.length === 0) {
    return (
      <EmptyLine
        title="All clear."
        body="Nothing needs your attention right now — operational alerts will appear here as work stacks up."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.title}>
          <Link
            to={it.to as never}
            className="group flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-ink/30"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink/60" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{it.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{it.body}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RecentLeadsTable({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  if (loading) return <SkeletonRows n={4} />;
  if (leads.length === 0) {
    return (
      <EmptyLine
        title="No leads yet."
        body="When someone requests a resource, their details appear here. Click a row to open the CRM profile."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <th className="pb-3 pr-4 font-semibold">Name</th>
            <th className="pb-3 pr-4 font-semibold">Platform</th>
            <th className="pb-3 pr-4 font-semibold">Resource</th>
            <th className="pb-3 pr-4 font-semibold">Stage</th>
            <th className="pb-3 pr-0 font-semibold">Created</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
              <td className="py-3 pr-4">
                <Link to="/admin/crm/contacts" className="flex items-center gap-3 min-w-0">
                  <Avatar name={l.full_name} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{l.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{l.email}</span>
                  </span>
                </Link>
              </td>
              <td className="py-3 pr-4 text-ink/80">{l.platform || "—"}</td>
              <td className="py-3 pr-4 text-ink/80">
                {l.resources?.title ? (
                  <span className="truncate">{l.resources.title}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 pr-4">
                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  New
                </span>
              </td>
              <td className="py-3 pr-0 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentResources({ resources, loading }: { resources: Resource[]; loading: boolean }) {
  if (loading) return <SkeletonRows n={3} />;
  if (resources.length === 0) {
    return (
      <EmptyLine
        title="Nothing catalogued."
        body="Recently updated resources appear here with their status and last edit time."
      />
    );
  }
  return (
    <ul className="divide-y divide-border">
      {resources.map((r) => (
        <li key={r.id} className="flex items-center gap-4 py-4">
          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-secondary">
            {r.thumbnail_url ? (
              <img src={r.thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{r.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {r.status === "published" ? "Published" : r.status === "draft" ? "Draft" : r.status} ·{" "}
              Updated {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}
            </p>
          </div>
          <Link
            to="/admin/resources/$id"
            params={{ id: r.id }}
            className="text-xs font-medium text-ink/70 underline-offset-4 hover:text-ink hover:underline"
          >
            Edit
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ActivityTimeline({
  leads,
  resources,
  loading,
}: {
  leads: Lead[];
  resources: Resource[];
  loading: boolean;
}) {
  if (loading) return <SkeletonRows n={4} />;

  type Evt = { id: string; when: Date; text: React.ReactNode };
  const events: Evt[] = [];

  for (const l of leads) {
    events.push({
      id: `l-${l.id}`,
      when: new Date(l.created_at),
      text: (
        <>
          <strong className="font-medium text-ink">{l.full_name}</strong>{" "}
          {l.resources?.title ? (
            <>requested <span className="text-ink">{l.resources.title}</span></>
          ) : (
            "was captured as a lead"
          )}
          {l.platform ? <> from {l.platform}</> : null}.
        </>
      ),
    });
  }
  for (const r of resources) {
    const isNew = Math.abs(new Date(r.created_at).getTime() - new Date(r.updated_at).getTime()) < 5000;
    events.push({
      id: `r-${r.id}`,
      when: new Date(r.updated_at),
      text: (
        <>
          Resource <strong className="font-medium text-ink">{r.title}</strong>{" "}
          {isNew ? "was published" : "was updated"}.
        </>
      ),
    });
  }
  events.sort((a, b) => b.when.getTime() - a.when.getTime());
  const top = events.slice(0, 8);

  if (top.length === 0) {
    return (
      <EmptyLine
        title="No activity yet."
        body="Every lead, publish and edit will be logged here, newest first."
      />
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {top.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[22px] top-1.5 h-1.5 w-1.5 rounded-full bg-ink/60" />
          <p className="text-[15px] leading-relaxed text-ink/80">{e.text}</p>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            {formatDistanceToNow(e.when, { addSuffix: true })}
          </p>
        </li>
      ))}
    </ol>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to as never}
      className="group flex items-center gap-3 rounded-md px-3 py-3 text-sm text-ink/80 transition-colors hover:bg-secondary hover:text-ink"
    >
      <Icon className="h-4 w-4 shrink-0 text-ink/60 group-hover:text-ink" />
      <span className="flex-1">{label}</span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
    </Link>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-ink">
      {initials || <UserCircle2 className="h-4 w-4" />}
    </span>
  );
}

function EmptyLine({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-white/50 p-6">
      <p className="font-serif text-lg italic text-ink/70">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary/60" />
      ))}
    </div>
  );
}

/* ──────────────────────── Command search ──────────────────────── */

function CommandSearch({
  onClose,
  resources,
  leads,
}: {
  onClose: () => void;
  resources: Resource[];
  leads: Lead[];
}) {
  const [term, setTerm] = useState("");
  const filteredR = resources.filter((r) =>
    (r.title + " " + r.category).toLowerCase().includes(term.toLowerCase()),
  );
  const filteredL = leads.filter((l) =>
    (l.full_name + " " + l.email + " " + l.platform).toLowerCase().includes(term.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/20 px-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search resources, leads, contacts, companies…"
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          <SearchGroup title="Resources">
            {filteredR.length === 0 ? (
              <SearchEmpty label={resources.length === 0 ? "No resources yet." : "No matches."} />
            ) : (
              filteredR.slice(0, 6).map((r) => (
                <SearchItem key={r.id} to="/admin/resources/$id" params={{ id: r.id }} onClose={onClose}>
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{r.title}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
                    {r.status}
                  </span>
                </SearchItem>
              ))
            )}
          </SearchGroup>
          <SearchGroup title="Leads">
            {filteredL.length === 0 ? (
              <SearchEmpty label={leads.length === 0 ? "No leads yet." : "No matches."} />
            ) : (
              filteredL.slice(0, 6).map((l) => (
                <SearchItem key={l.id} to="/admin/leads" onClose={onClose}>
                  <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{l.full_name}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">{l.email}</span>
                </SearchItem>
              ))
            )}
          </SearchGroup>
          <SearchGroup title="Sections">
            <SearchItem to="/admin/crm/contacts" onClose={onClose}>Contacts</SearchItem>
            <SearchItem to="/admin/crm/companies" onClose={onClose}>Companies</SearchItem>
            <SearchItem to="/admin/email/campaigns" onClose={onClose}>Campaigns</SearchItem>
            <SearchItem to="/admin/email/templates" onClose={onClose}>Templates</SearchItem>
            <SearchItem to="/admin/pipeline" onClose={onClose}>Pipeline</SearchItem>
          </SearchGroup>
        </div>
      </div>
    </div>
  );
}

function SearchGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

function SearchItem({
  to,
  params,
  onClose,
  children,
}: {
  to: string;
  params?: Record<string, string>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      onClick={onClose}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink/80 hover:bg-secondary hover:text-ink"
    >
      {children}
    </Link>
  );
}

function SearchEmpty({ label }: { label: string }) {
  return <p className="px-3 py-2 text-xs text-muted-foreground">{label}</p>;
}
