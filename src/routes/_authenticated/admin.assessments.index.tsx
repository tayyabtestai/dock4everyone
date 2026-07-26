import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAssessments, duplicateAssessment, deleteAssessment, upsertAssessment } from "@/lib/assessments.functions";
import { toast } from "sonner";
import { Copy, Link as LinkIcon, Trash2, Archive, ExternalLink, BarChart3, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/assessments/")({
  head: () => ({ meta: [{ title: "All Assessments — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: AllAssessments,
});

function AllAssessments() {
  const list = useServerFn(listAssessments);
  const dup = useServerFn(duplicateAssessment);
  const del = useServerFn(deleteAssessment);
  const upsert = useServerFn(upsertAssessment);
  const qc = useQueryClient();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published" | "archived">("all");

  const { data = [], isLoading } = useQuery({ queryKey: ["assessments"], queryFn: () => list() });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data as any[]).filter((r) =>
      (status === "all" || r.status === status) &&
      (!s || r.name.toLowerCase().includes(s) || r.slug.toLowerCase().includes(s) || (r.industry ?? "").toLowerCase().includes(s))
    );
  }, [data, q, status]);

  const dupM = useMutation({ mutationFn: (id: string) => dup({ data: { id } }),
    onSuccess: () => { toast.success("Duplicated"); qc.invalidateQueries({ queryKey: ["assessments"] }); } });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["assessments"] }); } });

  async function archive(row: any) {
    await upsert({ data: { ...row, status: "archived" } as any });
    toast.success("Archived");
    qc.invalidateQueries({ queryKey: ["assessments"] });
  }
  async function copyLink(slug: string) {
    const url = `${window.location.origin}/assessment/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Public link copied");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Assessment Engine</p>
          <h1 className="font-serif text-4xl leading-tight text-ink">All Assessments</h1>
          <p className="mt-2 text-sm text-muted-foreground">Interactive calculators and assessments. Each has its own public link — none appear on the homepage.</p>
        </div>
        <Link to="/admin/assessments/new" className="rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground hover:opacity-90">New Assessment</Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, slug, industry…"
          className="w-72 rounded-full border border-border bg-white px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ink" />
        {(["all", "draft", "published", "archived"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-wider ${status === s ? "border-ink bg-ink text-primary-foreground" : "border-border bg-white text-muted-foreground hover:border-ink/40"}`}>{s}</button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Assessment</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                No assessments yet. <Link to="/admin/assessments/new" className="text-ink underline underline-offset-4">Create the first one.</Link>
              </td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{r.name || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground">/{r.slug}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.industry || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${r.status === "published" ? "bg-ink text-primary-foreground" : r.status === "archived" ? "bg-muted text-muted-foreground" : "border border-border text-ink/70"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn title="Edit" onClick={() => router.navigate({ to: "/admin/assessments/$id", params: { id: r.id } })}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Duplicate" onClick={() => dupM.mutate(r.id)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Analytics" onClick={() => router.navigate({ to: "/admin/assessments/analytics", search: { id: r.id } as any })}><BarChart3 className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Copy public link" onClick={() => copyLink(r.slug)}><LinkIcon className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Open" onClick={() => window.open(`/assessment/${r.slug}`, "_blank")}><ExternalLink className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Archive" onClick={() => archive(r)}><Archive className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Delete" onClick={() => confirm("Delete this assessment?") && delM.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md text-ink/60 hover:bg-secondary hover:text-ink">
      {children}
    </button>
  );
}