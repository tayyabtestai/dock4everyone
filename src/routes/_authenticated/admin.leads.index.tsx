import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, Upload, Download, Search, X, ExternalLink, Trash2, Tag as TagIcon, Users, Sparkles,
  Filter as FilterIcon, Columns3, SlidersHorizontal, ChevronDown,
} from "lucide-react";
import {
  adminListLeads, adminCreateLead, adminExportLeads, adminBulkUpdateLeads, adminDeleteLeads, adminAllTags,
} from "@/lib/leads/admin.functions";
import { INDUSTRIES, SOURCES, PLATFORMS, STATUSES, STATUS_LABEL } from "@/lib/leads/taxonomy";
import type { LeadFilters } from "@/lib/leads/filters";
import { hasActiveFilters } from "@/lib/leads/filters";
import { DEFAULT_COLUMNS, TABLE_COLUMNS } from "@/lib/leads/fields";
import { LeadForm, EMPTY_LEAD, Select, type LeadFormValue } from "@/components/admin/lead-form";
import { exportLeadsCsv, exportLeadsXlsx } from "@/lib/leads/export";

type Search = { new?: string };

export const Route = createFileRoute("/_authenticated/admin/leads/")({
  validateSearch: (s: Record<string, unknown>): Search => ({ new: typeof s['new'] === "string" ? s['new'] : undefined }),
  head: () => ({
    meta: [
      { title: "Leads — Dock Owner Console" },
      { name: "description", content: "Filter, import, export and manage every lead captured by Dock." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadsPage,
});

const PAGE_SIZES = [25, 50, 100];
const COLS_KEY = "dock.admin.leads.columns";

const STATUS_TONE: Record<string, string> = {
  new: "bg-accent/10 text-accent",
  contacted: "bg-chart-3/15 text-ink",
  qualified: "bg-chart-5/20 text-ink",
  nurturing: "bg-chart-4/20 text-ink",
  converted: "bg-chart-5/25 text-ink",
  lost: "bg-destructive/10 text-destructive",
};

function LeadsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const qc = useQueryClient();

  const list = useServerFn(adminListLeads);
  const create = useServerFn(adminCreateLead);
  const exportFn = useServerFn(adminExportLeads);
  const bulk = useServerFn(adminBulkUpdateLeads);
  const del = useServerFn(adminDeleteLeads);
  const allTagsFn = useServerFn(adminAllTags);

  const [filters, setFilters] = useState<LeadFilters>({});
  const [searchDraft, setSearchDraft] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<string[]>([]);
  const [showNew, setShowNew] = useState(search.new === "1");
  const [showFilters, setShowFilters] = useState(false);
  const [showCols, setShowCols] = useState(false);
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [form, setForm] = useState<LeadFormValue>(EMPTY_LEAD);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length) setColumns(parsed);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(COLS_KEY, JSON.stringify(columns)); } catch { /* ignore */ }
  }, [columns]);

  useEffect(() => {
    const t = setTimeout(() => { setFilters((f) => ({ ...f, search: searchDraft || undefined })); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const q = useQuery({
    queryKey: ["admin", "leads", filters, page, pageSize],
    queryFn: () => list({ data: { filters, page, pageSize, sort: "created_at", dir: "desc" } }),
    staleTime: 5_000,
  });

  const tagsQ = useQuery({ queryKey: ["admin", "lead-tags"], queryFn: () => allTagsFn(), staleTime: 60_000 });

  const rows = (q.data?.rows ?? []) as unknown as Record<string, unknown>[];
  const total = q.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const active = hasActiveFilters(filters);

  const newToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return rows.filter((r) => new Date(String(r['created_at'])).getTime() >= start.getTime()).length;
  }, [rows]);
  const withFunnel = useMemo(() => rows.filter((r) => Boolean(r['funnel_name'])).length, [rows]);

  const createMut = useMutation({
    mutationFn: (v: LeadFormValue) => create({ data: v }),
    onSuccess: () => {
      toast.success("Lead added");
      setShowNew(false); setForm(EMPTY_LEAD);
      navigate({ to: "/admin/leads", search: {} });
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMut = useMutation({
    mutationFn: (input: { ids: string[]; status?: string; addTags?: string[]; removeTags?: string[] }) => bulk({ data: input }),
    onSuccess: () => { toast.success("Leads updated"); setSelected([]); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (ids: string[]) => del({ data: { ids } }),
    onSuccess: (r) => { toast.success(`${r.deleted} lead(s) deleted`); setSelected([]); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function doExport(kind: "csv" | "xlsx", ids?: string[]) {
    try {
      const data = await exportFn({ data: { filters, ids } });
      if (!data.length) { toast.error("Nothing to export"); return; }
      (kind === "csv" ? exportLeadsCsv : exportLeadsXlsx)(data as unknown as Record<string, unknown>[], columns);
      toast.success(`Exported ${data.length} lead(s)`);
    } catch (e) { toast.error((e as Error).message); }
  }

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.includes(String(r['id'])));
  const setFilter = (patch: Partial<LeadFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const tagOptions = useMemo(() => tagsQ.data ?? [], [tagsQ.data]);
  const visible = TABLE_COLUMNS.filter((c) => columns.includes(c.key));

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="mt-1 hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent sm:grid">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow mb-3">Database</p>
            <h1 className="font-serif text-4xl leading-tight md:text-[42px]">Leads</h1>
            <p className="mt-2 text-sm text-muted-foreground">Manage, filter, import, and review every lead in Dock.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-[0_10px_24px_-14px_var(--accent)] hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Lead
          </button>
          <Link to="/admin/leads/import" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary">
            <Upload className="h-4 w-4" /> Import
          </Link>
          <div className="inline-flex overflow-hidden rounded-full border border-border bg-card">
            <button onClick={() => doExport("csv")} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm hover:bg-secondary">
              <Download className="h-4 w-4" /> CSV
            </button>
            <span className="w-px bg-border" />
            <button onClick={() => doExport("xlsx")} className="px-4 py-2 text-sm hover:bg-secondary">XLSX</button>
          </div>
        </div>
      </header>

      {/* KPI row */}
      <section className="mt-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total leads" value={total} icon={Users} />
        <Stat label="New today" value={newToday} icon={Sparkles} hint="On this page" />
        <Stat label="From funnels" value={withFunnel} icon={FilterIcon} hint="On this page" />
        <Stat label="Selected" value={selected.length} icon={SlidersHorizontal} hint={selected.length ? "Bulk actions available" : "Nothing selected"} />
      </section>

      {/* Toolbar */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search name, email, business, phone or website…"
              className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent/50 focus:bg-card"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
              showFilters || active ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-card hover:bg-secondary"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
            {active && <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground">on</span>}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowCols((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm hover:bg-secondary"
            >
              <Columns3 className="h-4 w-4" /> Columns <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {showCols && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowCols(false)} />
                <div className="absolute right-0 z-40 mt-2 max-h-[320px] w-64 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Visible columns</span>
                    <button onClick={() => setColumns(DEFAULT_COLUMNS)} className="text-[11px] text-accent hover:underline">Reset</button>
                  </div>
                  {TABLE_COLUMNS.map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary">
                      <input
                        type="checkbox"
                        checked={columns.includes(c.key)}
                        onChange={(e) =>
                          setColumns((cur) => (e.target.checked ? [...cur, c.key] : cur.filter((k) => k !== c.key)))
                        }
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 md:grid-cols-4 xl:grid-cols-7">
            <Select value={filters.industry ?? ""} onChange={(v) => setFilter({ industry: v || undefined })} options={INDUSTRIES as unknown as string[]} placeholder="Industry" />
            <Select value={filters.source ?? ""} onChange={(v) => setFilter({ source: v || undefined })} options={SOURCES as unknown as string[]} placeholder="Source" />
            <Select value={filters.platform ?? ""} onChange={(v) => setFilter({ platform: v || undefined })} options={PLATFORMS as unknown as string[]} placeholder="Platform" />
            <Select value={filters.status ?? ""} onChange={(v) => setFilter({ status: v || undefined })} options={STATUSES as unknown as string[]} labels={STATUS_LABEL} placeholder="Status" />
            <Select value={filters.tags?.[0] ?? ""} onChange={(v) => setFilter({ tags: v ? [v] : undefined })} options={tagOptions} placeholder="Tag" />
            <input
              type="date"
              value={filters.from?.slice(0, 10) ?? ""}
              onChange={(e) => setFilter({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/50"
            />
            <input
              type="date"
              value={filters.to?.slice(0, 10) ?? ""}
              onChange={(e) => setFilter({ to: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : undefined })}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/50"
            />
          </div>
        )}

        {active && (
          <button onClick={() => { setFilters({}); setSearchDraft(""); setPage(1); }} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground underline hover:text-ink">
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) { bulkMut.mutate({ ids: selected, status: e.target.value }); e.target.value = ""; } }}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
          >
            <option value="">Change status…</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button
            onClick={() => { const t = window.prompt("Tag to add"); if (t?.trim()) bulkMut.mutate({ ids: selected, addTags: [t.trim()] }); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 hover:bg-secondary"
          >
            <TagIcon className="h-3.5 w-3.5" /> Add tag
          </button>
          <button
            onClick={() => { const t = window.prompt("Tag to remove"); if (t?.trim()) bulkMut.mutate({ ids: selected, removeTags: [t.trim()] }); }}
            className="rounded-lg border border-border bg-card px-3 py-1.5 hover:bg-secondary"
          >
            Remove tag
          </button>
          <button onClick={() => void doExport("csv", selected)} className="rounded-lg border border-border bg-card px-3 py-1.5 hover:bg-secondary">
            Export selected
          </button>
          <button
            onClick={() => { if (window.confirm(`Delete ${selected.length} lead(s)? This cannot be undone.`)) deleteMut.mutate(selected); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-card px-3 py-1.5 text-destructive hover:bg-destructive/5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        {q.isLoading ? (
          <div className="space-y-2 p-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-11 animate-pulse rounded-md bg-secondary" />)}</div>
        ) : q.isError ? (
          <div className="p-10 text-center">
            <p className="text-sm text-destructive">Could not load leads. {(q.error as Error).message}</p>
            <button onClick={() => q.refetch()} className="mt-4 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Try again</button>
          </div>
        ) : !rows.length ? (
          <div className="px-6 py-20 text-center">
            <p className="font-serif text-2xl italic text-ink/70">{active ? "No leads match your filters." : "No leads yet"}</p>
            {active ? (
              <button onClick={() => { setFilters({}); setSearchDraft(""); }} className="mt-5 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Clear filters</button>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">Leads collected through your funnels and imports will appear here.</p>
                <div className="mt-6 flex justify-center gap-2">
                  <button onClick={() => setShowNew(true)} className="rounded-full bg-accent px-4 py-2 text-sm text-accent-foreground hover:opacity-90">Add Lead</button>
                  <Link to="/admin/leads/import" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Import Leads</Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="divide-y divide-border md:hidden">
              {rows.map((l) => (
                <li key={String(l['id'])} className="p-4">
                  <Link to="/admin/leads/$id" params={{ id: String(l['id']) }} className="font-medium text-ink">{String(l['full_name'] ?? "—")}</Link>
                  <p className="text-sm text-muted-foreground">{String(l['email'] ?? "")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[l['business_name'], l['industry'], l['source']].filter(Boolean).join(" • ") || "—"}
                  </p>
                  <p className="mt-2"><StatusPill status={String(l['status'] ?? "new")} /></p>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b border-border bg-secondary/60 text-left">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...new Set([...selected, ...rows.map((r) => String(r['id']))])]
                              : selected.filter((id) => !rows.some((r) => String(r['id']) === id)),
                          )
                        }
                      />
                    </th>
                    {visible.map((c) => <Th key={c.key}>{c.label}</Th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((l) => {
                    const id = String(l['id']);
                    return (
                      <tr key={id} className="transition-colors hover:bg-secondary/50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(id)}
                            onChange={(e) => setSelected(e.target.checked ? [...selected, id] : selected.filter((x) => x !== id))}
                          />
                        </td>
                        {visible.map((c) => (
                          <td key={c.key} className="px-4 py-3 align-middle">
                            <Cell column={c.key} row={l} id={id} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{total} lead{total === 1 ? "" : "s"} · page {page} of {pages}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-border bg-card px-2 py-1 text-xs"
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-border bg-card px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-border bg-card px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {showNew && (
        <Modal title="Add lead" onClose={() => { setShowNew(false); navigate({ to: "/admin/leads", search: {} }); }}>
          <LeadForm
            value={form}
            onChange={setForm}
            submitting={createMut.isPending}
            submitLabel="Save lead"
            onCancel={() => { setShowNew(false); navigate({ to: "/admin/leads", search: {} }); }}
            onSubmit={() => createMut.mutate(form)}
          />
        </Modal>
      )}
    </div>
  );
}

function Cell({ column, row, id }: { column: string; row: Record<string, unknown>; id: string }) {
  const raw = row[column];
  if (column === "full_name") {
    const name = String(raw || row['email'] || "—");
    return (
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">
          {name.charAt(0).toUpperCase()}
        </span>
        <Link to="/admin/leads/$id" params={{ id }} className="font-medium text-ink hover:text-accent hover:underline">{name}</Link>
      </div>
    );
  }
  if (column === "status") return <StatusPill status={String(raw ?? "new")} />;
  if (column === "created_at") return <span className="text-xs text-muted-foreground">{raw ? format(new Date(String(raw)), "MMM d, yyyy") : "—"}</span>;
  if (column === "tags") {
    const tags = Array.isArray(raw) ? (raw as string[]) : [];
    if (!tags.length) return <span className="text-muted-foreground">—</span>;
    return (
      <span className="flex flex-wrap gap-1">
        {tags.slice(0, 3).map((t) => (
          <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{t}</span>
        ))}
      </span>
    );
  }
  if (column === "website" || column === "linkedin" || column === "company_linkedin") {
    if (!raw) return <span className="text-muted-foreground">—</span>;
    return (
      <a href={String(raw)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-accent hover:underline">
        Visit <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  if (raw === null || raw === undefined || raw === "") return <span className="text-muted-foreground">—</span>;
  return <span className="text-muted-foreground">{String(raw)}</span>;
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_TONE[status] ?? "bg-secondary text-ink"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function Stat({ label, value, hint, icon: Icon }: {
  label: string; value: number; hint?: string; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 font-serif text-3xl leading-none tabular-nums">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="console fixed inset-0 z-50 overflow-y-auto bg-ink/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto my-8 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</th>;
}
