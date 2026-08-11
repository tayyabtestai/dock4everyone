import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Upload,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { adminImportLeads, adminImportHistory } from "@/lib/leads/admin.functions";
import {
  LEAD_FIELDS,
  GROUP_LABEL,
  FIELD_BY_KEY,
  guessField,
  type FieldGroup,
} from "@/lib/leads/fields";
import { parseSpreadsheet } from "@/lib/leads/export";
import type { ImportSummary } from "@/lib/leads/schemas";

export const Route = createFileRoute("/_authenticated/admin/leads/import")({
  head: () => ({
    meta: [{ title: "Import leads — Dock Owner Console" }, { name: "robots", content: "noindex" }],
  }),
  component: ImportPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAGE_SIZE = 25;
const GROUP_ORDER: FieldGroup[] = ["contact", "company", "location", "source", "management"];

/** Fields grouped for the mapping <select>, in a stable order. */
const FIELDS_BY_GROUP = GROUP_ORDER.map((g) => ({
  group: g,
  label: GROUP_LABEL[g],
  fields: LEAD_FIELDS.filter((f) => f.group === g),
}));

type Row = Record<string, string>;

function ImportPage() {
  const qc = useQueryClient();
  const importFn = useServerFn(adminImportLeads);
  const historyFn = useServerFn(adminImportHistory);

  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Row[]>([]); // editable, keyed by field
  const [duplicates, setDuplicates] = useState<"skip" | "update">("skip");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [mapOpen, setMapOpen] = useState(true);
  const [page, setPage] = useState(0);

  const history = useQuery({ queryKey: ["admin", "lead-imports"], queryFn: () => historyFn() });

  /** Derive editable field-keyed rows from the raw file rows + current mapping. */
  function deriveRows(raw: Row[], map: Record<string, string>): Row[] {
    return raw.map((r) => {
      const o: Row = {};
      for (const [col, field] of Object.entries(map)) {
        if (field && r[col] != null && r[col] !== "") o[field] = String(r[col]);
      }
      return o;
    });
  }

  async function onFile(file: File) {
    try {
      const parsed = await parseSpreadsheet(file);
      if (!parsed.headers.length) {
        toast.error("Could not read any columns from that file");
        return;
      }
      const map: Record<string, string> = {};
      for (const h of parsed.headers) map[h] = guessField(h);
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows as Row[]);
      setMapping(map);
      setRows(deriveRows(parsed.rows as Row[], map));
      setSummary(null);
      setPage(0);
      setMapOpen(true);
      const detected = new Set(Object.values(map).filter(Boolean)).size;
      toast.success(`${parsed.rows.length} rows · ${detected} columns auto-mapped`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function remap(col: string, field: string) {
    const next = { ...mapping, [col]: field };
    setMapping(next);
    setRows(deriveRows(rawRows, next)); // re-derive (resets manual edits)
  }

  /** Active field columns, in registry order, email first. */
  const activeFields = useMemo(() => {
    const keys = new Set(Object.values(mapping).filter(Boolean));
    const ordered = LEAD_FIELDS.filter((f) => keys.has(f.key)).map((f) => f.key);
    return ["email", ...ordered.filter((k) => k !== "email")].filter(
      (k) => keys.has(k) || (k === "email" && keys.has("email")),
    );
  }, [mapping]);

  const emailMapped = Object.values(mapping).includes("email");
  const readyCount = useMemo(
    () => rows.filter((r) => EMAIL_RE.test((r["email"] ?? "").trim().toLowerCase())).length,
    [rows],
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const mut = useMutation({
    mutationFn: () => importFn({ data: { file_name: fileName, rows, duplicates } }),
    onSuccess: (s) => {
      setSummary(s);
      toast.success(`${s.imported} lead(s) imported`);
      qc.invalidateQueries({ queryKey: ["admin"] }); // refreshes leads + dashboard + funnels stats
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function editCell(absIndex: number, field: string, value: string) {
    setRows((cur) => {
      const next = cur.slice();
      next[absIndex] = { ...next[absIndex], [field]: value };
      return next;
    });
  }
  function deleteRow(absIndex: number) {
    setRows((cur) => cur.filter((_, i) => i !== absIndex));
  }
  function deleteAll() {
    if (rows.length && window.confirm(`Remove all ${rows.length} row(s) from this import?`)) {
      setRows([]);
      setPage(0);
    }
  }
  function reset() {
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setRows([]);
    setSummary(null);
    setPage(0);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 md:py-10">
      <Link
        to="/admin/leads"
        search={{}}
        className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All leads
      </Link>
      <header className="mb-6">
        <p className="eyebrow mb-3">Data</p>
        <h1 className="font-serif text-4xl leading-tight">Import Leads</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a CSV or Excel file. Columns are auto-detected and mapped — review, edit any cell,
          drop rows you don&apos;t want, then import.
        </p>
      </header>

      {!headers.length ? (
        <section className="rounded-2xl border border-border bg-card p-6">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center transition-colors hover:bg-secondary/40">
            <Upload className="mb-3 h-6 w-6 text-accent" />
            <span className="text-sm font-medium">Choose a CSV or XLSX file</span>
            <span className="mt-1 text-xs text-muted-foreground">
              Your headers don&apos;t need to match — Dock maps ~{LEAD_FIELDS.length} lead fields
              automatically.
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </label>
        </section>
      ) : (
        <>
          {/* Sticky action bar */}
          <div className="sticky top-0 z-20 -mx-5 mb-4 border-y border-border bg-canvas/90 px-5 py-3 backdrop-blur md:top-2 md:mx-0 md:rounded-2xl md:border">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{rows.length.toLocaleString()}</span>
                <span className="text-muted-foreground">row{rows.length === 1 ? "" : "s"}</span>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1 text-[var(--chart-5)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {readyCount.toLocaleString()} ready
                </span>
                {rows.length - readyCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {(rows.length - readyCount).toLocaleString()} missing email
                  </span>
                )}
              </div>
              <span className="mx-1 truncate text-xs text-muted-foreground">{fileName}</span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Duplicates
                  <select
                    value={duplicates}
                    onChange={(e) => setDuplicates(e.target.value as "skip" | "update")}
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-ink"
                  >
                    <option value="skip">Skip existing</option>
                    <option value="update">Update existing</option>
                  </select>
                </label>
                <button
                  onClick={deleteAll}
                  disabled={!rows.length}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete all
                </button>
                <button
                  onClick={reset}
                  className="rounded-full border border-border bg-card px-3 py-2 text-sm hover:bg-secondary"
                >
                  Change file
                </button>
                <button
                  onClick={() => mut.mutate()}
                  disabled={!emailMapped || !readyCount || mut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground shadow-[0_10px_24px_-14px_var(--accent)] hover:opacity-90 disabled:opacity-50"
                >
                  {mut.isPending
                    ? "Importing…"
                    : `Import ${readyCount.toLocaleString()} lead${readyCount === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
            {!emailMapped && (
              <p className="mt-2 text-xs text-destructive">
                Map a column to <b>Email</b> below — it&apos;s required to import.
              </p>
            )}
          </div>

          {/* Column mapping (collapsible) */}
          <section className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
            <button
              onClick={() => setMapOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <h2 className="font-serif text-xl leading-tight">Map columns</h2>
                <p className="text-xs text-muted-foreground">
                  {Object.values(mapping).filter(Boolean).length} of {headers.length} file columns
                  mapped · unmapped columns are ignored
                </p>
              </div>
              {mapOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {mapOpen && (
              <div className="grid grid-cols-1 gap-2 border-t border-border p-4 md:grid-cols-2 xl:grid-cols-3">
                {headers.map((h) => {
                  const sample = rawRows.find((r) => r[h])?.[h] ?? "";
                  const mapped = mapping[h];
                  return (
                    <div
                      key={h}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${mapped ? "border-border bg-secondary/30" : "border-dashed border-border"}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{h}</p>
                        {sample && (
                          <p className="truncate text-[11px] text-muted-foreground">
                            e.g. {sample}
                          </p>
                        )}
                      </div>
                      <select
                        value={mapped ?? ""}
                        onChange={(e) => remap(h, e.target.value)}
                        className={`w-[46%] shrink-0 rounded-lg border border-border bg-card px-2 py-1.5 text-sm ${mapped ? "text-ink" : "text-muted-foreground"}`}
                      >
                        <option value="">Ignore</option>
                        {FIELDS_BY_GROUP.map((grp) => (
                          <optgroup key={grp.group} label={grp.label}>
                            {grp.fields.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Editable preview */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-serif text-lg leading-tight">Preview &amp; edit</h2>
              <p className="text-xs text-muted-foreground">
                Every cell is editable — fill blanks or fix values before importing.
              </p>
            </div>
            {!rows.length ? (
              <p className="px-5 py-16 text-center text-sm text-muted-foreground">
                No rows left to import.{" "}
                <button onClick={reset} className="text-accent hover:underline">
                  Choose another file
                </button>
                .
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="sticky left-0 z-10 w-10 bg-secondary/50 px-2 py-2"></th>
                        {activeFields.map((k) => (
                          <th
                            key={k}
                            className="whitespace-nowrap px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {FIELD_BY_KEY[k]?.label ?? k}
                            {k === "email" && <span className="ml-1 text-destructive">*</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r, i) => {
                        const absIndex = page * PAGE_SIZE + i;
                        const badEmail = !EMAIL_RE.test((r["email"] ?? "").trim().toLowerCase());
                        return (
                          <tr
                            key={absIndex}
                            className="border-t border-border/70 hover:bg-secondary/20"
                          >
                            <td className="sticky left-0 z-10 bg-card px-2 py-1 text-center">
                              <button
                                onClick={() => deleteRow(absIndex)}
                                title="Remove row"
                                className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                            {activeFields.map((k) => (
                              <td key={k} className="px-1 py-0.5">
                                <input
                                  value={r[k] ?? ""}
                                  onChange={(e) => editCell(absIndex, k, e.target.value)}
                                  className={`w-full min-w-[130px] rounded-md border bg-transparent px-2 py-1 text-sm outline-none focus:border-accent/60 focus:bg-secondary/40 ${
                                    k === "email" && badEmail
                                      ? "border-destructive/50"
                                      : "border-transparent hover:border-border"
                                  }`}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {pageCount > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
                    <span>
                      Rows {page * PAGE_SIZE + 1}–{Math.min(rows.length, (page + 1) * PAGE_SIZE)} of{" "}
                      {rows.length.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={page <= 0}
                        onClick={() => setPage((p) => p - 1)}
                        className="rounded-full border border-border bg-card px-3 py-1.5 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span>
                        {page + 1} / {pageCount}
                      </span>
                      <button
                        disabled={page >= pageCount - 1}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-full border border-border bg-card px-3 py-1.5 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      {summary && (
        <section className="mt-4 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-4">
          <Stat label="Imported" value={summary.imported} tone="text-[var(--chart-5)]" />
          <Stat label="Updated" value={summary.updated} />
          <Stat label="Duplicates" value={summary.duplicates} />
          <Stat
            label="Invalid"
            value={summary.invalid}
            tone={summary.invalid ? "text-destructive" : undefined}
          />
        </section>
      )}

      <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-serif text-xl">Import history</h2>
        </div>
        {history.isLoading ? (
          <div className="space-y-2 p-5">
            {[0, 1].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-secondary/60" />
            ))}
          </div>
        ) : !history.data?.length ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No imports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr>
                  {["File", "Date", "Imported", "Skipped", "Duplicates", "Failed"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.data.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-2">{h.file_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {format(new Date(h.created_at), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-2">{h.imported_count}</td>
                    <td className="px-4 py-2 text-muted-foreground">{h.skipped_count}</td>
                    <td className="px-4 py-2 text-muted-foreground">{h.duplicate_count}</td>
                    <td className="px-4 py-2 text-muted-foreground">{h.failed_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-serif text-3xl tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
