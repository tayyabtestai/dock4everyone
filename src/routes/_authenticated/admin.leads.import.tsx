import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Upload } from "lucide-react";
import { adminImportLeads, adminImportHistory } from "@/lib/leads/admin.functions";
import { IMPORT_FIELDS, guessMapping, type ImportFieldKey } from "@/lib/leads/taxonomy";
import { parseSpreadsheet } from "@/lib/leads/export";
import type { ImportSummary } from "@/lib/leads/schemas";

export const Route = createFileRoute("/_authenticated/admin/leads/import")({
  head: () => ({ meta: [{ title: "Import leads — Dock Owner Console" }, { name: "robots", content: "noindex" }] }),
  component: ImportPage,
});

function ImportPage() {
  const qc = useQueryClient();
  const importFn = useServerFn(adminImportLeads);
  const historyFn = useServerFn(adminImportHistory);

  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, ImportFieldKey | "">>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const history = useQuery({ queryKey: ["admin", "lead-imports"], queryFn: () => historyFn() });

  const mut = useMutation({
    mutationFn: () => {
      const mapped = rows.map((r) => {
        const o: Record<string, string> = {};
        for (const [col, field] of Object.entries(mapping)) if (field) o[field] = r[col] ?? "";
        return o;
      });
      return importFn({ data: { file_name: fileName, rows: mapped } });
    },
    onSuccess: (s) => {
      setSummary(s);
      toast.success(`${s.imported} lead(s) imported`);
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(file: File) {
    try {
      const parsed = await parseSpreadsheet(file);
      if (!parsed.headers.length) { toast.error("Could not read any columns from that file"); return; }
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setSummary(null);
      const m: Record<string, ImportFieldKey | ""> = {};
      for (const h of parsed.headers) m[h] = guessMapping(h);
      setMapping(m);
    } catch (e) { toast.error((e as Error).message); }
  }

  const emailMapped = Object.values(mapping).includes("email");
  const preview = rows.slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
      <Link to="/admin/leads" search={{}} className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All leads
      </Link>
      <header className="mb-8">
        <p className="eyebrow mb-3">Data</p>
        <h1 className="font-serif text-4xl leading-tight">Import Leads</h1>
        <p className="mt-2 text-sm text-muted-foreground">Upload a CSV or Excel file, map the columns, preview, then import.</p>
      </header>

      <section className="rounded-2xl border border-border bg-white p-6">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center hover:bg-secondary/30">
          <Upload className="mb-3 h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">{fileName || "Choose a CSV or XLSX file"}</span>
          <span className="mt-1 text-xs text-muted-foreground">Your columns don't need to match — you'll map them next.</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
          />
        </label>
      </section>

      {headers.length > 0 && (
        <>
          <section className="mt-4 rounded-2xl border border-border bg-white p-6">
            <h2 className="font-serif text-xl">Map columns</h2>
            <p className="mt-1 text-xs text-muted-foreground">{rows.length} row(s) detected. Email is required.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <span className="w-1/2 truncate text-sm text-muted-foreground">{h}</span>
                  <select
                    value={mapping[h] ?? ""}
                    onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as ImportFieldKey | "" })}
                    className="w-1/2 rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Ignore</option>
                    {IMPORT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-serif text-xl">Preview</h2>
              <p className="text-xs text-muted-foreground">First {preview.length} row(s)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/30 text-left">
                  <tr>{headers.map((h) => <th key={h} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map((r, i) => (
                    <tr key={i}>{headers.map((h) => <td key={h} className="px-4 py-2 text-muted-foreground">{r[h]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-4">
              {!emailMapped && <span className="text-xs text-destructive">Map a column to Email before importing.</span>}
              <button
                onClick={() => mut.mutate()}
                disabled={!emailMapped || mut.isPending}
                className="ml-auto rounded-full bg-ink px-5 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {mut.isPending ? "Importing…" : `Import ${rows.length} row(s)`}
              </button>
            </div>
          </section>
        </>
      )}

      {summary && (
        <section className="mt-4 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-white p-6 sm:grid-cols-4">
          <Stat label="Imported" value={summary.imported} />
          <Stat label="Duplicates" value={summary.duplicates} />
          <Stat label="Invalid" value={summary.invalid} />
          <Stat label="Skipped" value={summary.skipped} />
        </section>
      )}

      <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-white">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-serif text-xl">Import history</h2>
        </div>
        {history.isLoading ? (
          <div className="space-y-2 p-5">{[0, 1].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-secondary/60" />)}</div>
        ) : !history.data?.length ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No imports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/30 text-left">
                <tr>{["File", "Date", "Imported", "Skipped", "Duplicates", "Failed"].map((h) => (
                  <th key={h} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.data.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-2">{h.file_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{format(new Date(h.created_at), "MMM d, yyyy HH:mm")}</td>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value}</p>
    </div>
  );
}
