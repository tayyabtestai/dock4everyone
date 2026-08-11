import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Bell,
  Filter as FilterIcon,
  Users,
  Eye,
  Inbox,
  Gauge,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  List,
  LayoutGrid,
  MoreHorizontal,
  X,
  Pencil,
  Copy,
  Send,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import {
  adminListFunnels,
  adminFunnelKpis,
  adminCreateFunnel,
  adminSetFunnelStatus,
  adminDuplicateFunnel,
  adminDeleteFunnel,
  adminInstallTemplate,
} from "@/lib/funnels/admin.functions";
import { templateCards } from "@/lib/funnels/templates";
import {
  FUNNEL_STATUSES,
  FUNNEL_STATUS_LABEL,
  FUNNEL_STATUS_TONE,
  FUNNEL_INDUSTRY_OPTIONS,
  industryTone,
  primaryIndustry,
  slugify,
  type FunnelStatus,
} from "@/lib/funnels/taxonomy";
import { Select } from "@/components/admin/lead-form";
import type { FunnelRow } from "@/lib/funnels/admin.server";
import { FunnelDetailPanel, type FunnelAction } from "@/components/admin/funnel-detail-panel";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/admin/funnels")({
  head: () => ({
    meta: [{ title: "Funnels — Dock Owner Console" }, { name: "robots", content: "noindex" }],
  }),
  component: FunnelsPage,
});

const SORTS: Record<string, string> = {
  newest: "Newest",
  oldest: "Oldest",
  views: "Most Views",
  submissions: "Most Submissions",
  conversion: "Highest Conversion",
  name: "Name A–Z",
};
type Sort = keyof typeof SORTS;
type Tab = "all" | "published" | "draft" | "archived";
type FunnelListRow = FunnelRow;

function FunnelsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const listFn = useServerFn(adminListFunnels);
  const kpiFn = useServerFn(adminFunnelKpis);
  const createFn = useServerFn(adminCreateFunnel);
  const statusFn = useServerFn(adminSetFunnelStatus);
  const dupFn = useServerFn(adminDuplicateFunnel);
  const delFn = useServerFn(adminDeleteFunnel);
  const installFn = useServerFn(adminInstallTemplate);

  const [tab, setTab] = useState<Tab>("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchDraft.trim()), 300);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const listQ = useQuery({
    queryKey: ["admin", "funnels", { tab, search, industry, sort }],
    queryFn: () =>
      listFn({ data: { tab, search: search || undefined, industry: industry || undefined, sort } }),
    staleTime: 5_000,
  });
  const kpiQ = useQuery({
    queryKey: ["admin", "funnel-kpis"],
    queryFn: () => kpiFn(),
    staleTime: 5_000,
  });

  const rows = listQ.data?.rows ?? [];
  const counts = listQ.data?.counts ?? { all: 0, published: 0, draft: 0, archived: 0 };
  const k = kpiQ.data;

  const refetchAll = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const createMut = useMutation({
    mutationFn: (v: {
      name: string;
      description: string;
      industries: string[];
      status: "draft" | "published";
      slug: string;
    }) => createFn({ data: v }),
    onSuccess: (r) => {
      toast.success("Funnel created");
      setShowCreate(false);
      setSelectedId(r.id);
      refetchAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: FunnelStatus }) => statusFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(
        `Funnel ${v.status === "published" ? "published" : v.status === "archived" ? "archived" : "moved to draft"}`,
      );
      refetchAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const dupMut = useMutation({
    mutationFn: (id: string) => dupFn({ data: { id } }),
    onSuccess: (r) => {
      toast.success("Funnel duplicated");
      setSelectedId(r.id);
      refetchAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Funnel deleted");
      setSelectedId(null);
      refetchAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const installMut = useMutation({
    mutationFn: (key: string) => installFn({ data: { key, publish: true } }),
    onSuccess: (r) => {
      toast.success("Funnel added and published");
      setShowCreate(false);
      setSelectedId(r.id);
      refetchAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleAction(
    action: FunnelAction | "duplicate" | "publish" | "unpublish" | "archive" | "restore" | "delete",
    f: FunnelListRow,
  ) {
    switch (action) {
      case "preview":
        if (f.status === "published") {
          window.open(`/funnel/${f.slug}`, "_blank", "noopener");
        } else {
          toast.info("Publish this funnel to open its live public page.");
        }
        break;
      case "edit":
      case "more":
        void navigate({ to: "/admin/funnels/$id", params: { id: f.id } });
        break;
      case "duplicate":
        dupMut.mutate(f.id);
        break;
      case "publish":
        statusMut.mutate({ id: f.id, status: "published" });
        break;
      case "unpublish":
        statusMut.mutate({ id: f.id, status: "draft" });
        break;
      case "archive":
        if (window.confirm(`Archive "${f.name}"? Its public link will stop working.`))
          statusMut.mutate({ id: f.id, status: "archived" });
        break;
      case "restore":
        statusMut.mutate({ id: f.id, status: "draft" });
        break;
      case "delete":
        if (window.confirm(`Delete "${f.name}" permanently? This cannot be undone.`))
          delMut.mutate(f.id);
        break;
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-10">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="mt-1 hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent sm:grid">
            <FilterIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow mb-3">Funnels</p>
            <h1 className="font-serif text-4xl leading-tight md:text-[42px]">Funnels</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Create, publish, and analyze your funnels. Turn responses into qualified leads.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative hidden min-w-[220px] sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search funnels…"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent/50"
            />
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:bg-secondary"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground shadow-[0_10px_24px_-14px_var(--accent)] hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Create Funnel
          </button>
        </div>
      </header>

      {/* KPI cards */}
      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label="Active Funnels"
          value={k?.activeFunnels}
          delta={k?.activeFunnelsDelta}
          loading={kpiQ.isLoading}
          icon={Users}
          tint="var(--chart-1)"
        />
        <Kpi
          label="Total Views"
          value={k?.totalViews}
          delta={k?.totalViewsDelta}
          loading={kpiQ.isLoading}
          icon={Eye}
          tint="var(--chart-3)"
        />
        <Kpi
          label="Total Submissions"
          value={k?.totalSubmissions}
          delta={k?.totalSubmissionsDelta}
          loading={kpiQ.isLoading}
          icon={Inbox}
          tint="var(--chart-4)"
        />
        <Kpi
          label="Conversion Rate"
          value={k ? `${k.conversionRate}%` : undefined}
          delta={k?.conversionRateDelta}
          suffix="%"
          loading={kpiQ.isLoading}
          icon={Gauge}
          tint="var(--chart-2)"
        />
        <Kpi
          label="Leads Generated"
          value={k?.leadsGenerated}
          delta={k?.leadsGeneratedDelta}
          loading={kpiQ.isLoading}
          icon={Building2}
          tint="var(--chart-5)"
        />
      </section>

      {/* Body: list + optional detail column */}
      <div className="mt-6 flex items-start gap-5">
        <div className="min-w-0 flex-1">
          {/* Tabs + controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1">
              {(["all", "published", "draft", "archived"] as Tab[]).map((t) => {
                const label = t === "all" ? "All Funnels" : FUNNEL_STATUS_LABEL[t as FunnelStatus];
                const count = counts[t];
                const active = tab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${active ? "bg-secondary font-medium text-ink" : "text-muted-foreground hover:text-ink"}`}
                  >
                    {label}
                    <span
                      className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Search funnels…"
                  className="w-[180px] rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-accent/50"
                />
              </div>
              <div className="w-[150px]">
                <Select
                  value={industry}
                  onChange={setIndustry}
                  options={FUNNEL_INDUSTRY_OPTIONS as unknown as string[]}
                  placeholder="Industry"
                />
              </div>
              <div className="w-[130px]">
                <Select
                  value={tab === "all" ? "" : tab}
                  onChange={(v) => setTab((v || "all") as Tab)}
                  options={FUNNEL_STATUSES as unknown as string[]}
                  labels={FUNNEL_STATUS_LABEL}
                  placeholder="Status"
                />
              </div>
              <div className="w-[170px]">
                <Select
                  value={sort}
                  onChange={(v) => setSort((v || "newest") as Sort)}
                  options={Object.keys(SORTS)}
                  labels={SORTS}
                  placeholder="Sort"
                />
              </div>
              <div className="inline-flex overflow-hidden rounded-xl border border-border bg-card">
                <button
                  onClick={() => setView("list")}
                  className={`grid h-9 w-9 place-items-center ${view === "list" ? "bg-secondary text-ink" : "text-muted-foreground hover:bg-secondary/60"}`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("grid")}
                  className={`grid h-9 w-9 place-items-center ${view === "grid" ? "bg-secondary text-ink" : "text-muted-foreground hover:bg-secondary/60"}`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {listQ.isLoading ? (
            <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-secondary" />
              ))}
            </div>
          ) : listQ.isError ? (
            <div className="mt-4 rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-sm text-destructive">
                Could not load funnels. {(listQ.error as Error).message}
              </p>
              <button
                onClick={() => listQ.refetch()}
                className="mt-4 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
              >
                Try again
              </button>
            </div>
          ) : !rows.length ? (
            <EmptyState hasFunnels={counts.all > 0} onCreate={() => setShowCreate(true)} />
          ) : view === "grid" ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rows.map((f) => (
                <GridCard
                  key={f.id}
                  f={f}
                  active={f.id === selectedId}
                  onOpen={() => setSelectedId(f.id)}
                  onAction={(a) => handleAction(a, f)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="border-b border-border bg-secondary/60 text-left">
                    <tr>
                      <Th>Funnel Name</Th>
                      <Th>Industry</Th>
                      <Th>Status</Th>
                      <Th right>Views</Th>
                      <Th right>Submissions</Th>
                      <Th>Conversion</Th>
                      <Th>Created</Th>
                      <Th right>Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((f) => (
                      <tr
                        key={f.id}
                        onClick={() => setSelectedId(f.id)}
                        className={`cursor-pointer transition-colors hover:bg-secondary/50 ${f.id === selectedId ? "bg-secondary/60" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-[11px] font-semibold uppercase text-accent">
                              {initials(f.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink">{f.name}</p>
                              {f.description && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {f.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <IndustryBadge industries={f.industries} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={f.status as FunnelStatus} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {f.views.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {f.submissions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums">{f.conversion}%</span>
                            <Sparkline data={f.spark} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {format(new Date(f.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowActions f={f} onAction={(a) => handleAction(a, f)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {rows.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {rows.length} of {counts.all} funnel{counts.all === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {/* Detail panel — inline column on xl, overlay drawer below xl */}
        {selectedId && (
          <>
            <div
              className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm xl:hidden"
              onClick={() => setSelectedId(null)}
            />
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border bg-card shadow-xl xl:sticky xl:top-6 xl:z-auto xl:w-[380px] xl:max-w-none xl:max-h-[calc(100vh-3rem)] xl:shrink-0 xl:self-start xl:rounded-2xl xl:border xl:shadow-none">
              <FunnelDetailPanel
                id={selectedId}
                onClose={() => setSelectedId(null)}
                onAction={(a) => {
                  const f = rows.find((r) => r.id === selectedId);
                  if (f) handleAction(a, f);
                }}
              />
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateFunnelModal
          submitting={createMut.isPending}
          installing={installMut.isPending ? installMut.variables : null}
          onClose={() => setShowCreate(false)}
          onSubmit={(v) => createMut.mutate(v)}
          onInstall={(key) => installMut.mutate(key)}
        />
      )}
    </div>
  );
}

/* ---------- pieces ---------- */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("") || "F";
}

function Kpi({
  label,
  value,
  delta,
  suffix,
  loading,
  icon: Icon,
  tint,
}: {
  label: string;
  value?: number | string;
  delta?: number;
  suffix?: string;
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}) {
  const display = typeof value === "number" ? value.toLocaleString() : value;
  const Trend =
    delta === undefined ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor =
    delta === undefined || delta === 0
      ? "text-muted-foreground"
      : delta > 0
        ? "text-[var(--chart-5)]"
        : "text-destructive";
  const deltaText =
    delta === undefined
      ? null
      : delta === 0
        ? "No change vs last 7 days"
        : `${delta > 0 ? "+" : ""}${suffix === "%" ? delta : delta.toLocaleString()}${suffix ?? ""} vs last 7 days`;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(30,30,60,0.04)]">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-2xl"
        style={{ background: `color-mix(in oklch, ${tint} 10%, transparent)` }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{ background: `color-mix(in oklch, ${tint} 12%, transparent)`, color: tint }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {loading ? (
        <div className="relative mt-4 h-9 w-20 animate-pulse rounded bg-secondary" />
      ) : (
        <p className="relative mt-3 font-serif text-[34px] leading-none tabular-nums">
          {display ?? "—"}
        </p>
      )}
      {deltaText && !loading && (
        <p className={`relative mt-2 flex items-center gap-1 text-xs ${trendColor}`}>
          {Trend && <Trend className="h-3 w-3" />} {deltaText}
        </p>
      )}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 62,
    h = 20,
    p = 2;
  const max = Math.max(1, ...data);
  const n = data.length > 1 ? data.length - 1 : 1;
  const pts = data
    .map((v, i) => `${p + (i * (w - 2 * p)) / n},${h - p - (v / max) * (h - 2 * p)}`)
    .join(" ");
  const nonzero = data.some((v) => v > 0);
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={nonzero ? "var(--chart-5)" : "var(--muted-foreground)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={nonzero ? 1 : 0.35}
      />
    </svg>
  );
}

function StatusPill({ status }: { status: FunnelStatus }) {
  const tone = FUNNEL_STATUS_TONE[status] ?? FUNNEL_STATUS_TONE.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {FUNNEL_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function IndustryBadge({ industries }: { industries: string[] }) {
  const label = primaryIndustry(industries);
  const extra = industries.length > 1 ? ` +${industries.length - 1}` : "";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${industryTone(label)}`}
    >
      {label}
      {extra}
    </span>
  );
}

function RowActions({
  f,
  onAction,
}: {
  f: FunnelListRow;
  onAction: (
    a:
      "preview" | "edit" | "duplicate" | "publish" | "unpublish" | "archive" | "restore" | "delete",
  ) => void;
}) {
  const isPublished = f.status === "published";
  const isArchived = f.status === "archived";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-ink"
          aria-label="Funnel actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onAction("preview")}>
          <Eye className="mr-2 h-4 w-4" /> Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("edit")}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("duplicate")}>
          <Copy className="mr-2 h-4 w-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isPublished ? (
          <DropdownMenuItem onClick={() => onAction("unpublish")}>
            <Archive className="mr-2 h-4 w-4" /> Unpublish
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onAction("publish")}>
            <Send className="mr-2 h-4 w-4" /> Publish
          </DropdownMenuItem>
        )}
        {isArchived ? (
          <DropdownMenuItem onClick={() => onAction("restore")}>
            <ArchiveRestore className="mr-2 h-4 w-4" /> Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onAction("archive")}>
            <Archive className="mr-2 h-4 w-4" /> Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onAction("delete")}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GridCard({
  f,
  active,
  onOpen,
  onAction,
}: {
  f: FunnelListRow;
  active: boolean;
  onOpen: () => void;
  onAction: (
    a:
      "preview" | "edit" | "duplicate" | "publish" | "unpublish" | "archive" | "restore" | "delete",
  ) => void;
}) {
  return (
    <div
      onClick={onOpen}
      className={`cursor-pointer rounded-2xl border bg-card p-4 transition-shadow hover:shadow-[0_18px_44px_-30px_rgba(30,30,60,0.5)] ${active ? "border-accent/40" : "border-border"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-xs font-semibold uppercase text-accent">
            {initials(f.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{f.name}</p>
            <StatusPill status={f.status as FunnelStatus} />
          </div>
        </div>
        <span onClick={(e) => e.stopPropagation()}>
          <RowActions f={f} onAction={onAction} />
        </span>
      </div>
      {f.description && (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{f.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <IndustryBadge industries={f.industries} />
        <Sparkline data={f.spark} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
        <Mini label="Views" value={f.views} />
        <Mini label="Subs" value={f.submissions} />
        <Mini label="Conv" value={`${f.conversion}%`} />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="font-serif text-lg leading-none tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function EmptyState({ hasFunnels, onCreate }: { hasFunnels: boolean; onCreate: () => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card px-6 py-20 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
        <FilterIcon className="h-6 w-6" />
      </span>
      <p className="mt-5 font-serif text-2xl italic text-ink/70">
        {hasFunnels ? "No funnels match your filters." : "No funnels yet"}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFunnels
          ? "Try a different tab, industry or search."
          : "Create your first funnel to start turning visitors into qualified leads."}
      </p>
      {!hasFunnels && (
        <button
          onClick={onCreate}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Create Funnel
        </button>
      )}
    </div>
  );
}

function CreateFunnelModal({
  submitting,
  installing,
  onClose,
  onSubmit,
  onInstall,
}: {
  submitting: boolean;
  installing: string | null;
  onClose: () => void;
  onSubmit: (v: {
    name: string;
    description: string;
    industries: string[];
    status: "draft" | "published";
    slug: string;
  }) => void;
  onInstall: (key: string) => void;
}) {
  const [mode, setMode] = useState<"choose" | "scratch">("choose");
  const cards = templateCards();

  if (mode === "choose") {
    return (
      <div
        className="console fixed inset-0 z-[60] overflow-y-auto bg-ink/30 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="mx-auto my-8 w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="font-serif text-2xl">Create funnel</h2>
              <p className="text-xs text-muted-foreground">
                Start from a ready-made template, or build from scratch.
              </p>
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((c) => {
              const busy = installing === c.key;
              return (
                <div
                  key={c.key}
                  className="flex flex-col rounded-xl border border-border bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-ink">{c.name}</h3>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {c.questionCount} Qs
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    <span className="font-medium text-ink/70">Objective:</span> {c.objective}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      disabled={!!installing}
                      onClick={() => onInstall(c.key)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      {busy ? "Adding…" : "Use template"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Templates install fully configured and published, ready to edit.
            </p>
            <button
              onClick={() => setMode("scratch")}
              className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              Start from scratch
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <ScratchForm submitting={submitting} onClose={onClose} onSubmit={onSubmit} />;
}

function ScratchForm({
  submitting,
  onClose,
  onSubmit,
}: {
  submitting: boolean;
  onClose: () => void;
  onSubmit: (v: {
    name: string;
    description: string;
    industries: string[];
    status: "draft" | "published";
    slug: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("All Industries");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const effectiveSlug = slugEdited ? slug : slugify(name);

  function submit() {
    if (name.trim().length < 2) {
      toast.error("Give your funnel a name");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      industries: industry === "All Industries" ? [] : [industry],
      status,
      slug: effectiveSlug,
    });
  }

  return (
    <div
      className="console fixed inset-0 z-[60] overflow-y-auto bg-ink/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto my-8 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl">Create funnel</h2>
            <p className="text-xs text-muted-foreground">
              Set the basics — you&apos;ll add questions in the builder next.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Funnel name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI Automation Assessment"
              autoFocus
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="One line explaining what this funnel assesses."
              className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target industry">
              <Select
                value={industry}
                onChange={setIndustry}
                options={FUNNEL_INDUSTRY_OPTIONS as unknown as string[]}
              />
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onChange={(v) => setStatus((v || "draft") as "draft" | "published")}
                options={["draft", "published"]}
                labels={{ draft: "Draft", published: "Published" }}
              />
            </Field>
          </div>
          <Field label="Public slug">
            <div className="flex items-center rounded-lg border border-border bg-white px-3 py-2 text-sm">
              <span className="text-muted-foreground">/funnel/</span>
              <input
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="funnel-slug"
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </div>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm text-accent-foreground hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create funnel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}
