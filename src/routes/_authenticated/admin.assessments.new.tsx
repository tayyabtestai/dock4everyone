import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listTemplates, createFromTemplate } from "@/lib/assessments.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/assessments/new")({
  head: () => ({ meta: [{ title: "New Assessment — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: NewAssessment,
});

function NewAssessment() {
  const tpls = useServerFn(listTemplates);
  const create = useServerFn(createFromTemplate);
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => { tpls().then(setTemplates).catch(() => {}); }, []);

  async function startFrom(template_id?: string) {
    try {
      const { id } = await create({ data: { template_id } });
      toast.success("Draft created");
      router.navigate({ to: "/admin/assessments/$id", params: { id } });
    } catch (e: any) { toast.error(e.message || "Could not create"); }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      <p className="eyebrow mb-2">Assessment Engine</p>
      <h1 className="font-serif text-4xl leading-tight text-ink">New Assessment</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Start from a blank canvas, or pick a template. Everything is fully editable afterwards.</p>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <button onClick={() => startFrom()} className="group rounded-lg border border-border bg-white p-6 text-left transition-colors hover:border-ink">
          <p className="eyebrow mb-2">Blank</p>
          <h3 className="font-serif text-2xl">Start from scratch</h3>
          <p className="mt-2 text-sm text-muted-foreground">Build questions, formulas, and results your own way.</p>
        </button>
        {templates.map((t) => (
          <button key={t.id} onClick={() => startFrom(t.id)} className="group rounded-lg border border-border bg-white p-6 text-left transition-colors hover:border-ink">
            <p className="eyebrow mb-2">{t.industry || "Template"}</p>
            <h3 className="font-serif text-2xl">{t.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t.description || "Reusable preset."}</p>
          </button>
        ))}
      </div>
    </div>
  );
}