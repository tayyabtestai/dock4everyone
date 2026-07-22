import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { deleteResource } from "@/lib/resources.functions";
import { Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/resources/")({
  head: () => ({ meta: [{ title: "Resources — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminResources,
});

function AdminResources() {
  const qc = useQueryClient();
  const del = useServerFn(deleteResource);
  const list = useQuery({
    queryKey: ["admin", "resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("id, slug, title, category, resource_type, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this resource? This can't be undone.")) return;
    try {
      await del({ data: { id } });
      toast.success("Resource deleted");
      qc.invalidateQueries({ queryKey: ["admin", "resources"] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="eyebrow mb-3">Manage</p>
          <h1 className="font-serif text-4xl leading-tight">Resources</h1>
        </div>
        <Link to="/admin/resources/new" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent">
          <Plus className="h-4 w-4" /> New resource
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {list.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : !list.data?.length ? (
          <div className="p-12 text-center">
            <p className="font-serif text-2xl italic text-ink/70">No resources yet.</p>
            <Link to="/admin/resources/new" className="mt-4 inline-block text-sm text-accent hover:underline">Create your first one →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <Th>Title</Th><Th>Category</Th><Th>Type</Th><Th>Status</Th><Th>Created</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.data.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{r.title}</div>
                    <div className="text-xs text-muted-foreground">/{r.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.category}</td>
                  <td className="px-4 py-3 uppercase text-xs tracking-widest text-muted-foreground">{r.resource_type}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      r.status === "published" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === "published" && (
                        <a href={`/resource/${r.slug}`} target="_blank" rel="noreferrer" className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-ink" title="View">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <Link to="/admin/resources/$id" params={{ id: r.id }} className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-ink" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => handleDelete(r.id)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</th>;
}
