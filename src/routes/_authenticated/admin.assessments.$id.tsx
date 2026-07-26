import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAssessment, upsertAssessment, deleteAssessment } from "@/lib/assessments.functions";
import { toast } from "sonner";
import type { Question, Formula, RecommendationRule, ResultConfig, LeadFields } from "@/lib/assessment-engine/types";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { evaluateFormulas, formatValue, renderTokens, applyRecommendations } from "@/lib/assessment-engine/evaluator";

export const Route = createFileRoute("/_authenticated/admin/assessments/$id")({
  head: () => ({ meta: [{ title: "Edit Assessment — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: EditAssessment,
});

const TABS = ["General", "Questions", "Formulas", "Result", "AI Recs", "Lead Capture", "Share"] as const;
type Tab = (typeof TABS)[number];

const QUESTION_TYPES: { value: Question["type"]; label: string }[] = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percentage", label: "Percentage" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "yes_no", label: "Yes / No" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "website", label: "Website" },
  { value: "date", label: "Date" },
  { value: "slider", label: "Slider" },
  { value: "file_upload", label: "File Upload (coming soon)" },
  { value: "rating", label: "Rating" },
];

function EditAssessment() {
  const { id } = Route.useParams();
  const get = useServerFn(getAssessment);
  const save = useServerFn(upsertAssessment);
  const del = useServerFn(deleteAssessment);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("General");
  const [row, setRow] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { get({ data: { id } }).then(setRow).catch((e: any) => toast.error(e.message)); }, [id]);

  if (!row) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;

  function update<K extends string>(patch: Record<K, any>) { setRow((r: any) => ({ ...r, ...patch })); }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        id: row.id, slug: row.slug, name: row.name, industry: row.industry ?? "", status: row.status,
        headline: row.headline ?? "", subheadline: row.subheadline ?? "", description: row.description ?? "",
        estimated_minutes: row.estimated_minutes ?? 3,
        primary_cta_label: row.primary_cta_label ?? "", primary_cta_url: row.primary_cta_url ?? "",
        secondary_cta_label: row.secondary_cta_label ?? "", secondary_cta_url: row.secondary_cta_url ?? "",
        seo_title: row.seo_title ?? "", seo_description: row.seo_description ?? "",
        featured_image_url: row.featured_image_url ?? "", og_image_url: row.og_image_url ?? "",
        questions: row.questions ?? [], formulas: row.formulas ?? [],
        result_config: row.result_config ?? {}, lead_fields: row.lead_fields ?? {},
        ai_recommendations: row.ai_recommendations ?? [],
      };
      await save({ data: payload as any });
      toast.success("Saved");
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this assessment?")) return;
    await del({ data: { id } });
    toast.success("Deleted");
    router.navigate({ to: "/admin/assessments" });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Assessment Engine</p>
          <h1 className="font-serif text-3xl leading-tight text-ink">{row.name || "Untitled"}</h1>
          <p className="mt-1 text-xs text-muted-foreground">/{row.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={row.status} onChange={(e) => update({ status: e.target.value })}
            className="rounded-full border border-border bg-white px-3 py-1.5 text-xs uppercase tracking-wider">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <a href={`/assessment/${row.slug}`} target="_blank" rel="noreferrer"
             className="rounded-full border border-border bg-white px-4 py-2 text-sm hover:border-ink/40">Preview</a>
          <button onClick={handleSave} disabled={saving}
                  className="rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={handleDelete} className="rounded-full border border-border bg-white px-3 py-2 text-sm text-destructive hover:border-destructive/40">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "General" && <GeneralTab row={row} update={update} />}
      {tab === "Questions" && <QuestionsTab row={row} update={update} />}
      {tab === "Formulas" && <FormulasTab row={row} update={update} />}
      {tab === "Result" && <ResultTab row={row} update={update} />}
      {tab === "AI Recs" && <RecsTab row={row} update={update} />}
      {tab === "Lead Capture" && <LeadTab row={row} update={update} />}
      {tab === "Share" && <ShareTab row={row} />}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
const inputCls = "w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ink";

function GeneralTab({ row, update }: any) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Field label="Name"><input className={inputCls} value={row.name ?? ""} onChange={(e) => update({ name: e.target.value })} /></Field>
      <Field label="Slug" hint="Lowercase letters, numbers, hyphens.">
        <input className={inputCls} value={row.slug ?? ""} onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
      </Field>
      <Field label="Industry"><input className={inputCls} value={row.industry ?? ""} onChange={(e) => update({ industry: e.target.value })} /></Field>
      <Field label="Estimated minutes"><input type="number" min={0} className={inputCls} value={row.estimated_minutes ?? 3} onChange={(e) => update({ estimated_minutes: parseInt(e.target.value) || 0 })} /></Field>
      <Field label="Headline"><input className={inputCls} value={row.headline ?? ""} onChange={(e) => update({ headline: e.target.value })} /></Field>
      <Field label="Subheadline"><input className={inputCls} value={row.subheadline ?? ""} onChange={(e) => update({ subheadline: e.target.value })} /></Field>
      <div className="md:col-span-2">
        <Field label="Description"><textarea rows={3} className={inputCls} value={row.description ?? ""} onChange={(e) => update({ description: e.target.value })} /></Field>
      </div>
      <Field label="Primary CTA label"><input className={inputCls} value={row.primary_cta_label ?? ""} onChange={(e) => update({ primary_cta_label: e.target.value })} /></Field>
      <Field label="Primary CTA URL"><input className={inputCls} value={row.primary_cta_url ?? ""} onChange={(e) => update({ primary_cta_url: e.target.value })} /></Field>
      <Field label="Secondary CTA label"><input className={inputCls} value={row.secondary_cta_label ?? ""} onChange={(e) => update({ secondary_cta_label: e.target.value })} /></Field>
      <Field label="Secondary CTA URL"><input className={inputCls} value={row.secondary_cta_url ?? ""} onChange={(e) => update({ secondary_cta_url: e.target.value })} /></Field>
      <Field label="SEO title"><input className={inputCls} value={row.seo_title ?? ""} onChange={(e) => update({ seo_title: e.target.value })} /></Field>
      <Field label="SEO description"><input className={inputCls} value={row.seo_description ?? ""} onChange={(e) => update({ seo_description: e.target.value })} /></Field>
      <Field label="Featured image URL"><input className={inputCls} value={row.featured_image_url ?? ""} onChange={(e) => update({ featured_image_url: e.target.value })} /></Field>
      <Field label="Open Graph image URL"><input className={inputCls} value={row.og_image_url ?? ""} onChange={(e) => update({ og_image_url: e.target.value })} /></Field>
    </div>
  );
}

function QuestionsTab({ row, update }: any) {
  const questions: Question[] = row.questions ?? [];
  function set(next: Question[]) { update({ questions: next }); }
  function add() {
    const id = `q${Math.random().toString(36).slice(2, 6)}`;
    set([...questions, { id, type: "short_text", title: "New question", required: false }]);
  }
  function move(i: number, d: number) {
    const n = [...questions]; const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]]; set(n);
  }
  function remove(i: number) { const n = [...questions]; n.splice(i, 1); set(n); }
  function duplicate(i: number) {
    const q = { ...questions[i], id: `q${Math.random().toString(36).slice(2, 6)}` };
    const n = [...questions]; n.splice(i + 1, 0, q); set(n);
  }
  function patch(i: number, p: Partial<Question>) { const n = [...questions]; n[i] = { ...n[i], ...p }; set(n); }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{questions.length} question{questions.length === 1 ? "" : "s"}</p>
        <button onClick={add} className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs hover:border-ink"><Plus className="h-3.5 w-3.5" /> Add question</button>
      </div>
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-border bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">{q.id}</span>
              <div className="flex items-center gap-1">
                <IconBtn title="Move up" onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                <IconBtn title="Move down" onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                <IconBtn title="Duplicate" onClick={() => duplicate(i)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                <IconBtn title="Delete" onClick={() => remove(i)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Type">
                <select className={inputCls} value={q.type} onChange={(e) => patch(i, { type: e.target.value as any })}>
                  {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Title"><input className={inputCls} value={q.title} onChange={(e) => patch(i, { title: e.target.value })} /></Field>
              <Field label="Description"><input className={inputCls} value={q.description ?? ""} onChange={(e) => patch(i, { description: e.target.value })} /></Field>
              <Field label="Placeholder"><input className={inputCls} value={q.placeholder ?? ""} onChange={(e) => patch(i, { placeholder: e.target.value })} /></Field>
              <Field label="Help text"><input className={inputCls} value={q.helpText ?? ""} onChange={(e) => patch(i, { helpText: e.target.value })} /></Field>
              <Field label="Error message"><input className={inputCls} value={q.errorMessage ?? ""} onChange={(e) => patch(i, { errorMessage: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!q.required} onChange={(e) => patch(i, { required: e.target.checked })} /> Required
              </label>
              <Field label="Default value"><input className={inputCls} value={(q.default as any) ?? ""} onChange={(e) => patch(i, { default: e.target.value })} /></Field>
              {["dropdown", "radio", "checkbox", "multiple_choice"].includes(q.type) && (
                <div className="md:col-span-2">
                  <Field label="Options (one per line, format: value|label)">
                    <textarea rows={3} className={inputCls}
                      value={(q.options ?? []).map((o) => `${o.value}|${o.label}`).join("\n")}
                      onChange={(e) => patch(i, { options: e.target.value.split("\n").filter(Boolean).map((line) => { const [v, l] = line.split("|"); return { value: v?.trim() ?? "", label: (l ?? v ?? "").trim() }; }) })}
                    />
                  </Field>
                </div>
              )}
              {q.type === "slider" && (
                <>
                  <Field label="Min"><input type="number" className={inputCls} value={q.min ?? 0} onChange={(e) => patch(i, { min: parseFloat(e.target.value) })} /></Field>
                  <Field label="Max"><input type="number" className={inputCls} value={q.max ?? 100} onChange={(e) => patch(i, { max: parseFloat(e.target.value) })} /></Field>
                  <Field label="Step"><input type="number" className={inputCls} value={q.step ?? 1} onChange={(e) => patch(i, { step: parseFloat(e.target.value) })} /></Field>
                </>
              )}
            </div>
          </div>
        ))}
        {questions.length === 0 && <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No questions yet. Add one above.</p>}
      </div>
    </div>
  );
}

function FormulasTab({ row, update }: any) {
  const formulas: Formula[] = row.formulas ?? [];
  const questions: Question[] = row.questions ?? [];
  function set(next: Formula[]) { update({ formulas: next }); }
  function add() {
    const id = `f${Math.random().toString(36).slice(2, 6)}`;
    set([...formulas, { id, label: "New variable", format: "number", steps: [] }]);
  }
  function patch(i: number, p: Partial<Formula>) { const n = [...formulas]; n[i] = { ...n[i], ...p }; set(n); }
  function remove(i: number) { const n = [...formulas]; n.splice(i, 1); set(n); }

  // Live preview with mocked answers = defaults or 0
  const mockAnswers = useMemo(() => {
    const a: Record<string, unknown> = {};
    for (const q of questions) a[q.id] = q.default ?? (["number", "currency", "percentage", "slider", "rating"].includes(q.type) ? 0 : "");
    return a;
  }, [questions]);
  const computed = evaluateFormulas(formulas, mockAnswers);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Ordered variables. Each variable runs its steps top-to-bottom; use `prev` to reference the previous step's result.</p>
          <button onClick={add} className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs hover:border-ink"><Plus className="h-3.5 w-3.5" /> Add variable</button>
        </div>
        <div className="space-y-3">
          {formulas.map((f, i) => (
            <div key={f.id} className="rounded-lg border border-border bg-white p-4">
              <div className="mb-3 grid gap-3 md:grid-cols-3">
                <Field label="Variable id"><input className={inputCls} value={f.id} onChange={(e) => patch(i, { id: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} /></Field>
                <Field label="Label"><input className={inputCls} value={f.label} onChange={(e) => patch(i, { label: e.target.value })} /></Field>
                <Field label="Format">
                  <select className={inputCls} value={f.format ?? "number"} onChange={(e) => patch(i, { format: e.target.value as any })}>
                    <option value="number">Number</option><option value="currency">Currency</option><option value="percent">Percent</option>
                  </select>
                </Field>
              </div>
              <StepsEditor steps={f.steps} onChange={(s) => patch(i, { steps: s })} questions={questions} formulas={formulas.slice(0, i)} />
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">Preview: <span className="font-mono text-ink">{formatValue(computed[f.id] ?? 0, f.format)}</span></span>
                <button onClick={() => remove(i)} className="text-xs text-destructive hover:underline">Delete</button>
              </div>
            </div>
          ))}
          {formulas.length === 0 && <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No formulas yet.</p>}
        </div>
      </div>
      <aside className="rounded-lg border border-border bg-white p-4 text-xs text-muted-foreground">
        <p className="mb-2 font-semibold text-ink">Available refs</p>
        <ul className="space-y-1">
          {questions.map((q) => <li key={q.id}><span className="font-mono text-ink">{q.id}</span> — {q.title}</li>)}
          {formulas.map((f) => <li key={f.id}><span className="font-mono text-ink">{f.id}</span> — {f.label}</li>)}
        </ul>
      </aside>
    </div>
  );
}

function StepsEditor({ steps, onChange, questions, formulas }: { steps: Formula["steps"]; onChange: (s: Formula["steps"]) => void; questions: Question[]; formulas: Formula[] }) {
  const OPS = ["add", "sub", "mul", "div", "pct", "round", "min", "max", "avg"] as const;
  const refs = [...questions.map((q) => ({ id: q.id, label: q.title })), ...formulas.map((f) => ({ id: f.id, label: f.label }))];
  function patch(i: number, p: any) { const n = [...steps]; n[i] = { ...n[i], ...p }; onChange(n); }
  function addStep() { onChange([...steps, { op: "add", args: [{ kind: "prev" }, { kind: "const", value: 0 }] }]); }
  function removeStep(i: number) { const n = [...steps]; n.splice(i, 1); onChange(n); }
  function setArg(si: number, ai: number, arg: any) {
    const n = [...steps]; const args = [...n[si].args]; args[ai] = arg; n[si] = { ...n[si], args }; onChange(n);
  }
  function addArg(si: number) { const n = [...steps]; n[si] = { ...n[si], args: [...n[si].args, { kind: "const", value: 0 }] }; onChange(n); }
  function removeArg(si: number, ai: number) { const n = [...steps]; const args = [...n[si].args]; args.splice(ai, 1); n[si] = { ...n[si], args }; onChange(n); }

  return (
    <div className="space-y-2">
      {steps.map((s, si) => (
        <div key={si} className="rounded-md border border-border bg-secondary/30 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select className="rounded border border-border bg-white px-2 py-1 text-xs" value={s.op} onChange={(e) => patch(si, { op: e.target.value })}>
              {OPS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            {s.args.map((a, ai) => (
              <div key={ai} className="flex items-center gap-1">
                <select className="rounded border border-border bg-white px-2 py-1 text-xs" value={a.kind}
                        onChange={(e) => setArg(si, ai, e.target.value === "const" ? { kind: "const", value: 0 } : e.target.value === "prev" ? { kind: "prev" } : { kind: "var", ref: refs[0]?.id ?? "" })}>
                  <option value="const">const</option><option value="var">var</option><option value="prev">prev</option>
                </select>
                {a.kind === "const" && <input type="number" className="w-20 rounded border border-border bg-white px-2 py-1 text-xs" value={(a as any).value} onChange={(e) => setArg(si, ai, { kind: "const", value: parseFloat(e.target.value) || 0 })} />}
                {a.kind === "var" && (
                  <select className="rounded border border-border bg-white px-2 py-1 text-xs" value={(a as any).ref} onChange={(e) => setArg(si, ai, { kind: "var", ref: e.target.value })}>
                    {refs.map((r) => <option key={r.id} value={r.id}>{r.id}</option>)}
                  </select>
                )}
                <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => removeArg(si, ai)}>×</button>
              </div>
            ))}
            <button className="rounded border border-border bg-white px-2 py-1 text-[11px]" onClick={() => addArg(si)}>+ arg</button>
            <button className="ml-auto text-xs text-destructive hover:underline" onClick={() => removeStep(si)}>Remove</button>
          </div>
        </div>
      ))}
      <button onClick={addStep} className="text-xs text-ink underline underline-offset-4">+ Add step</button>
    </div>
  );
}

function ResultTab({ row, update }: any) {
  const rc: ResultConfig = row.result_config ?? {};
  const formulas: Formula[] = row.formulas ?? [];
  function patch(p: Partial<ResultConfig>) { update({ result_config: { ...rc, ...p } }); }
  const mockComputed = useMemo(() => evaluateFormulas(formulas, {}), [formulas]);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Field label="Headline (supports {{var}} tokens)"><input className={inputCls} value={rc.headline ?? ""} onChange={(e) => patch({ headline: e.target.value })} /></Field>
      <Field label="Primary value variable">
        <select className={inputCls} value={rc.valueVar ?? ""} onChange={(e) => patch({ valueVar: e.target.value })}>
          <option value="">(none)</option>
          {formulas.map((f) => <option key={f.id} value={f.id}>{f.label} ({f.id})</option>)}
        </select>
      </Field>
      <div className="md:col-span-2"><Field label="Summary (supports {{var}} tokens)"><textarea rows={3} className={inputCls} value={rc.summary ?? ""} onChange={(e) => patch({ summary: e.target.value })} /></Field></div>
      <Field label="Primary CTA label"><input className={inputCls} value={rc.primary_cta_label ?? ""} onChange={(e) => patch({ primary_cta_label: e.target.value })} /></Field>
      <Field label="Primary CTA URL"><input className={inputCls} value={rc.primary_cta_url ?? ""} onChange={(e) => patch({ primary_cta_url: e.target.value })} /></Field>
      <Field label="Secondary CTA label"><input className={inputCls} value={rc.secondary_cta_label ?? ""} onChange={(e) => patch({ secondary_cta_label: e.target.value })} /></Field>
      <Field label="Secondary CTA URL"><input className={inputCls} value={rc.secondary_cta_url ?? ""} onChange={(e) => patch({ secondary_cta_url: e.target.value })} /></Field>
      <div className="md:col-span-2"><Field label="Success message"><input className={inputCls} value={rc.success_message ?? ""} onChange={(e) => patch({ success_message: e.target.value })} /></Field></div>
      <div className="md:col-span-2 rounded-lg border border-border bg-white p-6">
        <p className="eyebrow mb-2">Preview</p>
        <h3 className="font-serif text-3xl">{renderTokens(rc.headline ?? "Your result", mockComputed, formulas)}</h3>
        {rc.valueVar && <p className="mt-2 font-mono text-2xl text-ink">{formatValue(mockComputed[rc.valueVar] ?? 0, formulas.find(f => f.id === rc.valueVar)?.format)}</p>}
        {rc.summary && <p className="mt-3 text-sm text-muted-foreground">{renderTokens(rc.summary, mockComputed, formulas)}</p>}
      </div>
    </div>
  );
}

function RecsTab({ row, update }: any) {
  const recs: RecommendationRule[] = row.ai_recommendations ?? [];
  const formulas: Formula[] = row.formulas ?? [];
  function set(n: RecommendationRule[]) { update({ ai_recommendations: n }); }
  function add() {
    set([...recs, { id: `r${Math.random().toString(36).slice(2, 6)}`, when: { var: formulas[0]?.id ?? "", op: ">", value: 0 }, title: "New recommendation", body: "", priority: "medium" }]);
  }
  function patch(i: number, p: Partial<RecommendationRule>) { const n = [...recs]; n[i] = { ...n[i], ...p }; set(n); }
  function remove(i: number) { const n = [...recs]; n.splice(i, 1); set(n); }
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Rules trigger recommendations after formulas run. Ranked by priority.</p>
        <button onClick={add} className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs hover:border-ink"><Plus className="h-3.5 w-3.5" /> Add rule</button>
      </div>
      <div className="space-y-3">
        {recs.map((r, i) => (
          <div key={r.id} className="rounded-lg border border-border bg-white p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="When variable">
                <select className={inputCls} value={r.when.var} onChange={(e) => patch(i, { when: { ...r.when, var: e.target.value } })}>
                  {formulas.map((f) => <option key={f.id} value={f.id}>{f.id}</option>)}
                </select>
              </Field>
              <Field label="Op">
                <select className={inputCls} value={r.when.op} onChange={(e) => patch(i, { when: { ...r.when, op: e.target.value as any } })}>
                  {[">", ">=", "<", "<=", "==", "!="].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Value"><input type="number" className={inputCls} value={r.when.value} onChange={(e) => patch(i, { when: { ...r.when, value: parseFloat(e.target.value) || 0 } })} /></Field>
              <Field label="Priority">
                <select className={inputCls} value={r.priority} onChange={(e) => patch(i, { priority: e.target.value as any })}>
                  <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select>
              </Field>
              <div className="md:col-span-4"><Field label="Title"><input className={inputCls} value={r.title} onChange={(e) => patch(i, { title: e.target.value })} /></Field></div>
              <div className="md:col-span-4"><Field label="Body"><textarea rows={2} className={inputCls} value={r.body} onChange={(e) => patch(i, { body: e.target.value })} /></Field></div>
            </div>
            <button onClick={() => remove(i)} className="mt-3 text-xs text-destructive hover:underline">Delete</button>
          </div>
        ))}
        {recs.length === 0 && <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No rules yet.</p>}
      </div>
    </div>
  );
}

function LeadTab({ row, update }: any) {
  const lf: LeadFields = row.lead_fields ?? {};
  function patch(p: Partial<LeadFields>) { update({ lead_fields: { ...lf, ...p } }); }
  const fields: (keyof LeadFields)[] = ["name", "email", "phone", "company", "industry", "job_title", "team_size", "country", "consent"];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-border bg-white p-4">
        <p className="eyebrow mb-3">Fields</p>
        <div className="space-y-2">
          {fields.map((k) => (
            <label key={String(k)} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!lf[k]} onChange={(e) => patch({ [k]: e.target.checked } as any)} />
              <span className="capitalize">{String(k).replace("_", " ")}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Field label="Consent checkbox text"><input className={inputCls} value={lf.consent_text ?? ""} onChange={(e) => patch({ consent_text: e.target.value })} /></Field>
        <Field label="Privacy notice"><textarea rows={3} className={inputCls} value={lf.privacy_notice ?? ""} onChange={(e) => patch({ privacy_notice: e.target.value })} /></Field>
      </div>
    </div>
  );
}

function ShareTab({ row }: any) {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const url = `${origin}/assessment/${row.slug}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-border bg-white p-6">
        <p className="eyebrow mb-3">Public link</p>
        <input readOnly value={url} className={inputCls + " font-mono"} />
        <div className="mt-3 flex gap-2">
          <button onClick={async () => { await navigator.clipboard.writeText(url); toast.success("Copied"); }}
                  className="rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground hover:opacity-90">Copy link</button>
          <a href={url} target="_blank" rel="noreferrer" className="rounded-full border border-border bg-white px-4 py-2 text-sm hover:border-ink/40">Open</a>
        </div>
        {row.status !== "published" && (
          <p className="mt-4 text-xs text-muted-foreground">This assessment is <span className="font-semibold text-ink">{row.status}</span> — publish it to make the link work.</p>
        )}
      </div>
      <div className="rounded-lg border border-border bg-white p-6">
        <p className="eyebrow mb-3">QR code</p>
        {origin && <img src={qr} alt="QR code" className="h-56 w-56 rounded border border-border" />}
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick }: any) {
  return <button title={title} onClick={onClick} className="grid h-8 w-8 place-items-center rounded-md text-ink/60 hover:bg-secondary hover:text-ink">{children}</button>;
}