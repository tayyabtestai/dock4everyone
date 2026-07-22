import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResourceForm } from "@/components/admin/resource-form";

export const Route = createFileRoute("/_authenticated/admin/resources/$id")({
  head: () => ({ meta: [{ title: "Edit resource — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: EditResource,
});

function EditResource() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["admin", "resource", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("resources").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  if (q.isLoading) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  if (!q.data) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <p className="eyebrow mb-3">Edit</p>
      <h1 className="mb-10 font-serif text-4xl leading-tight">{q.data.title}</h1>
      <ResourceForm mode="edit" initial={q.data as any} />
    </div>
  );
}
