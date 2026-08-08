import * as XLSX from "xlsx";

const HEADERS = [
  ["full_name", "Name"], ["email", "Email"], ["phone", "Phone"],
  ["business_name", "Business Name"], ["industry", "Industry"], ["website", "Website"],
  ["source", "Source"], ["platform", "Platform"], ["funnel_name", "Funnel"],
  ["status", "Status"], ["tags", "Tags"], ["notes", "Notes"],
  ["location", "Location"], ["country", "Country"], ["created_at", "Created At"],
] as const;

export function leadsToSheet(rows: Record<string, unknown>[]) {
  return rows.map((r) => {
    const o: Record<string, string> = {};
    for (const [key, label] of HEADERS) {
      const v = r[key];
      o[label] = Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v);
    }
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

export function exportLeadsCsv(rows: Record<string, unknown>[], filename = `dock-leads-${Date.now()}.csv`) {
  const sheet = XLSX.utils.json_to_sheet(leadsToSheet(rows));
  const csv = XLSX.utils.sheet_to_csv(sheet);
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportLeadsXlsx(rows: Record<string, unknown>[], filename = `dock-leads-${Date.now()}.xlsx`) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leadsToSheet(rows)), "Leads");
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
