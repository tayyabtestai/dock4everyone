import * as XLSX from "xlsx";
import { FIELD_BY_KEY } from "./fields";

const HIDDEN = new Set(["id", "resource_id", "ip_address", "user_agent", "funnel_response_data", "funnel_result"]);

const cell = (v: unknown) =>
  Array.isArray(v) ? v.join(", ") : v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);

const label = (key: string) => FIELD_BY_KEY[key]?.label ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** `columns` limits the export; when omitted every available field is exported. */
export function leadsToSheet(rows: Record<string, unknown>[], columns?: string[]) {
  if (columns?.length) {
    return rows.map((r) => {
      const o: Record<string, string> = {};
      for (const key of columns) o[label(key)] = cell(r[key]);
      return o;
    });
  }
  const keys = new Set<string>();
  const customKeys = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) if (!HIDDEN.has(k) && k !== "custom_fields") keys.add(k);
    const cf = r['custom_fields'] as Record<string, unknown> | null | undefined;
    if (cf) for (const k of Object.keys(cf)) customKeys.add(k);
  }
  return rows.map((r) => {
    const o: Record<string, string> = {};
    for (const key of keys) o[label(key)] = cell(r[key]);
    const cf = (r['custom_fields'] ?? {}) as Record<string, unknown>;
    for (const key of customKeys) o[key] = cell(cf[key]);
    return o;
  });
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportLeadsCsv(rows: Record<string, unknown>[], columns?: string[], filename = `dock-leads-${Date.now()}.csv`) {
  const sheet = XLSX.utils.json_to_sheet(leadsToSheet(rows, columns));
  const csv = XLSX.utils.sheet_to_csv(sheet);
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportLeadsXlsx(rows: Record<string, unknown>[], columns?: string[], filename = `dock-leads-${Date.now()}.xlsx`) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leadsToSheet(rows, columns)), "Leads");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

/** Parses a CSV/XLSX file into header row + object rows keyed by header. */
export async function parseSpreadsheet(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return { headers: [], rows: [] };
  const ws = wb.Sheets[first]!;
  const matrix = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false, defval: "" });
  if (!matrix.length) return { headers: [], rows: [] };
  const headers = (matrix[0] ?? []).map((h) => String(h ?? "").trim()).filter(Boolean);
  const rows = matrix.slice(1).map((line) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = String(line[i] ?? "").trim(); });
    return o;
  }).filter((r) => Object.values(r).some((v) => v !== ""));
  return { headers, rows };
}
