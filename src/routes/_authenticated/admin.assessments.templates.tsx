import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listTemplates, createFromTemplate } from "@/lib/assessments.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/assessments/templates")({
  head: () => ({ meta: [{ title: "Templates — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: Templates,
});

function Templates() {
  const list = useServerFn(listTemplates);
  const create = useServerFn(createFromTemplate);
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { list().then(setItems).catch(() => {}); }, []);

  async function use(id: string) {
    try {
      const { id: newId } = await create({ data: { template_id: id } });
      toast.success("Draft created");
      router.navigate({ to: "/admin/assessments/$id", params: { id: newId } });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <p className="eyebrow mb-2">Assessment Engine</p>
      <h1 className="font-serif text-4xl leading-tight text-ink">Templates</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Reusable presets define questions, formulas, and results. The engine handles everything else.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <div key={t.id} className="flex flex-col rounded-lg border border-border bg-white p-6">
            <p className="eyebrow mb-2">{t.industry || "Template"}</p>
            <h3 className="font-serif text-2xl">{t.name}</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{t.description || "—"}</p>
            <button onClick={() => use(t.id)} className="mt-4 self-start rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground hover:opacity-90">Use template</button>
          </div>
        ))}
        {items.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No templates yet.</p>}
      </div>
    </div>
  );
}