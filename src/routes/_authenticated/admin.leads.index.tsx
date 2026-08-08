import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Upload, Download, Search, X, ExternalLink, Trash2, Tag as TagIcon } from "lucide-react";
import {
  adminListLeads, adminCreateLead, adminExportLeads, adminBulkUpdateLeads, adminDeleteLeads, adminAllTags,
} from "@/lib/leads/admin.functions";
import { INDUSTRIES, SOURCES, PLATFORMS, STATUSES, STATUS_LABEL } from "@/lib/leads/taxonomy";
import type { LeadFilters } from "@/lib/leads/filters";
import { hasActiveFilters } from "@/lib/leads/filters";
import { LeadForm, EMPTY_LEAD, Select, type LeadFormValue } from "@/components/admin/lead-form";
import { exportLeadsCsv, exportLeadsXlsx } from "@/lib/leads/export";

type Search = { new?: string };

export const Route = createFileRoute("/_authenticated/admin/leads/")({
  validateSearch: (s: Record<string, unknown>): Search => ({ new: typeof s['new'] === "string" ? s['new'] : undefined }),
  head: () => ({ meta: [{ title: "Leads — Dock Owner Console" }, { name: "robots", content: "noindex" }] }),
  component: LeadsPage,
});

const PAGE_SIZE = 25;

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
  const [selected, setSelected] = useState<string[]>([]);
  const [showNew, setShowNew] = useState(search.new === "1");
  const [form, setForm] = useState<LeadFormValue>(EMPTY_LEAD);

  useEffect(() => {
    const t = setTimeout(() => { setFilters((f) => ({ ...f, search: searchDraft || undefined })); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const q = useQuery({
    queryKey: ["admin", "leads", filters, page],
    queryFn: () => list({ data: { filters, page, pageSize: PAGE_SIZE, sort: "created_at", dir: "desc" } }),
    staleTime: 5_000,
  });

  const tagsQ = useQuery({ queryKey: ["admin", "lead-tags"], queryFn: () => allTagsFn(), staleTime: 60_000 });

  const rows = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const active = hasActiveFilters(filters);

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

  async function doExport(kind: "csv" | "xlsx") {
    try {
      const data = await exportFn({ data: filters });
      if (!data.length) { toast.error("Nothing to export"); return; }
      (kind === "csv" ? exportLeadsCsv : exportLeadsXlsx)(data as unknown as Record<string, unknown>[]);
      toast.success(`Exported ${data.length} lead(s)`);
    } catch (e) { toast.error((e as Error).message); }
  }

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const setFilter = (patch: Partial<LeadFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };

  const tagOptions = useMemo(() => tagsQ.data ?? [], [tagsQ.data]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Database</p>
          <h1 className="font-serif text-4xl leading-tight">Leads</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage, filter, import, and review all incoming leads.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Lead
          </button>
          <Link to="/admin/leads/import" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-sm hover:bg-secondary">
            <Upload className="h-4 w-4" /> Import Leads
          </Link>
          <div className="inline-flex overflow-hidden rounded-full border border-border bg-white">
            <button onClick={() => doExport("csv")} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm hover:bg-secondary">
              <Download className="h-4 w-4" /> CSV
            </button>
            <span className="w-px bg-border" />
            <button onClick={() => doExport("xlsx")} className="px-4 py-2 text-sm hover:bg-secondary">XLSX</button>
          </div>
        </div>
      </header>

      {/* Search + filters */}
      <div className="mb-4 rounded-2xl border border-border bg-white p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search name, email, business, phone or website…"
            className="w-full rounded-lg border border-border bg-canvas/40 py-2 pl-9 pr-3 text-sm outline-none focus:border-ink/40"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          <Select value={filters.industry ?? ""} onChange={(v) => setFilter({ industry: v || undefined })} options={INDUSTRIES as unknown as string[]} placeholder="Industry" />
          <Select value={filters.source ?? ""} onChange={(v) => setFilter({ source: v || undefined })} options={SOURCES as unknown as string[]} placeholder="Source" />
          <Select value={filters.platform ?? ""} onChange={(v) => setFilter({ platform: v || undefined })} options={PLATFORMS as unknown as string[]} placeholder="Platform" />
          <Select value={filters.status ?? ""} onChange={(v) => setFilter({ status: v || undefined })} options={STATUSES as unknown as string[]} labels={STATUS_LABEL} placeholder="Status" />
          <Select value={filters.tags?.[0] ?? ""} onChange={(v) => setFilter({ tags: v ? [v] : undefined })} options={tagOptions} placeholder="Tag" />
          <input
            type="date"
            value={filters.from?.slice(0, 10) ?? ""}
            onChange={(e) => setFilter({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
          />
          <input
            type="date"
            value={filters.to?.slice(0, 10) ?? ""}
            onChange={(e) => setFilter({ to: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : undefined })}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
          />
        </div>
        {active && (
          <button onClick={() => { setFilters({}); setSearchDraft(""); setPage(1); }} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground underline hover:text-ink">
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-ink/20 bg-secondary/40 px-4 py-3 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) { bulkMut.mutate({ ids: selected, status: e.target.value }); e.target.value = ""; } }}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm"
          >
            <option value="">Change status…</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button
            onClick={() => { const t = window.prompt("Tag to add"); if (t?.trim()) bulkMut.mutate({ ids: selected, addTags: [t.trim()] }); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 hover:bg-secondary"
          >
            <TagIcon className="h-3.5 w-3.5" /> Add tag
          </button>
          <button
            onClick={() => { const t = window.prompt("Tag to remove"); if (t?.trim()) bulkMut.mutate({ ids: selected, removeTags: [t.trim()] }); }}
            className="rounded-lg border border-border bg-white px-3 py-1.5 hover:bg-secondary"
          >
            Remove tag
          </button>
          <button
            onClick={async () => {
              const data = await exportFn({ data: filters });
              const subset = (data as unknown as Record<string, unknown>[]).filter((d) => selected.includes(d['id'] as string));
              exportLeadsCsv(subset);
            }}
            className="rounded-lg border border-border bg-white px-3 py-1.5 hover:bg-secondary"
          >
            Export selected
          </button>
          <button
            onClick={() => { if (window.confirm(`Delete ${selected.length} lead(s)? This cannot be undone.`)) deleteMut.mutate(selected); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-white px-3 py-1.5 text-destructive hover:bg-destructive/5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {q.isLoading ? (
          <div className="space-y-2 p-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-secondary/60" />)}</div>
        ) : q.isError ? (
          <div className="p-10 text-center">
            <p className="text-sm text-destructive">Could not load leads. {(q.error as Error).message}</p>
            <button onClick={() => q.refetch()} className="mt-4 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Try again</button>
          </div>
        ) : !rows.length ? (
          <div className="px-6 py-16 text-center">
            <p className="font-serif text-2xl italic text-ink/70">{active ? "No leads match your filters." : "No leads yet"}</p>
            {active ? (
              <button onClick={() => { setFilters({}); setSearchDraft(""); }} className="mt-5 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Clear filters</button>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">Leads collected through your funnels and imports will appear here.</p>
                <div className="mt-6 flex justify-center gap-2">
                  <button onClick={() => setShowNew(true)} className="rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground hover:opacity-90">Add Lead</button>
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
                <li key={l.id} className="p-4">
                  <Link to="/admin/leads/$id" params={{ id: l.id }} className="font-medium text-ink">{l.full_name}</Link>
                  <p className="text-sm text-muted-foreground">{l.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[l.business_name, l.industry, l.source].filter(Boolean).join(" • ") || "—"}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {STATUS_LABEL[l.status] ?? l.status} · {format(new Date(l.created_at), "MMM d")}
                  </p>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="border-b border-border bg-secondary/30 text-left">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={(e) => setSelected(e.target.checked ? [...new Set([...selected, ...rows.map((r) => r.id)])] : selected.filter((id) => !rows.some((r) => r.id === id)))}
                      />
                    </th>
                    <Th>Name</Th><Th>Email</Th><Th>Business</Th><Th>Industry</Th><Th>Funnel</Th><Th>Source</Th><Th>Website</Th><Th>Created</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((l) => (
                    <tr key={l.id} className="transition-colors hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(l.id)}
                          onChange={(e) => setSelected(e.target.checked ? [...selected, l.id] : selected.filter((id) => id !== l.id))}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link to="/admin/leads/$id" params={{ id: l.id }} className="font-medium text-ink hover:underline">{l.full_name}</Link>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{STATUS_LABEL[l.status] ?? l.status}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{l.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.business_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.industry || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.funnel_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {l.source || "—"}{l.platform ? <span className="block text-[11px]">{l.platform}</span> : null}
                      </td>
                      <td className="px-4 py-3">
                        {l.website ? (
                          <a href={l.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-ink hover:underline">
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : <span className="text-muted-foreground">Not provided</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(l.created_at), "MMM d, yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} lead{total === 1 ? "" : "s"} · page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-border bg-white px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-border bg-white px-3 py-1.5 disabled:opacity-40">Next</button>
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

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto my-8 w-full max-w-2xl rounded-2xl border border-border bg-white p-6 shadow-xl"
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
  return <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</th>;
}
