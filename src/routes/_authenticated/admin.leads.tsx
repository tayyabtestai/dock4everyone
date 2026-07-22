import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({ meta: [{ title: "Leads — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const q = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, email, phone, platform, browser, device, ip_address, created_at, resources(title, slug)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  function exportCsv() {
    if (!q.data) return;
    const rows = [
      ["Full name", "Email", "Phone", "Platform", "Resource", "Browser", "Device", "IP", "Timestamp"],
      ...q.data.map((l) => [
        l.full_name, l.email, l.phone ?? "", l.platform,
        l.resources?.title ?? "", l.browser ?? "", l.device ?? "", l.ip_address ?? "",
        new Date(l.created_at).toISOString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `dock-leads-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="eyebrow mb-3">CRM</p>
          <h1 className="font-serif text-4xl leading-tight">Leads</h1>
          <p className="mt-2 text-sm text-muted-foreground">{q.data?.length ?? 0} entries</p>
        </div>
        <button onClick={exportCsv} disabled={!q.data?.length} className="rounded-full border border-border bg-white px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50">
          Export CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {q.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : !q.data?.length ? (
          <div className="p-12 text-center">
            <p className="font-serif text-2xl italic text-ink/70">No leads yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/40 text-left">
                <tr>
                  <Th>Name</Th><Th>Email</Th><Th>Platform</Th><Th>Resource</Th><Th>Device</Th><Th>When</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {q.data.map((l: any) => (
                  <tr key={l.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{l.full_name}</div>
                      {l.phone && <div className="text-xs text-muted-foreground">{l.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{l.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{l.platform}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{l.resources?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.device} • {l.browser}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(l.created_at), "MMM d, HH:mm")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</th>;
}
