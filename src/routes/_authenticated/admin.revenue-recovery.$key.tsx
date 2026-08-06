import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import {
  getCalculator,
  updateCalculator,
  publishCalculator,
  unpublishCalculator,
  duplicateCalculator,
  archiveCalculator,
  upsertQuestion,
  deleteQuestion,
  upsertScoringRules,
  upsertRecommendation,
  deleteRecommendation,
  getCalculatorAnalytics,
} from "@/lib/revenue-recovery/calculators.functions";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/$key")({
  head: () => ({ meta: [{ title: "Calculator — Dock" }] }),
  component: CalculatorEditor,
});

type Tab = "general" | "questions" | "scoring" | "recommendations" | "report" | "analytics" | "publish";

function CalculatorEditor() {
  const { key } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getCalculator);
  const [tab, setTab] = useState<Tab>("general");

  const { data, isLoading, error } = useQuery({
    queryKey: ["rr-calc", key],
    queryFn: () => get({ data: { key } }),
  });

  if (isLoading) return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;
  if (error || !data) return <Shell><p className="text-sm text-destructive">Failed to load: {(error as Error)?.message}</p></Shell>;

  const calc = data.calculator;
  const isPublished = calc.status === "published";

  return (
    <Shell>
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="eyebrow mb-2">Revenue Recovery Platform</p>
          <h1 className="font-serif text-4xl leading-tight text-ink md:text-5xl">{calc.name}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{calc.tagline}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusPill status={calc.status} />
            {isPublished && (
              <a
                href={`/rr/${calc.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-ink hover:opacity-70"
              >
                Open public page <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <ActionButton
            label="Duplicate"
            onClick={async () => {
              const copy = await duplicateCalculator({ data: { id: calc.id } });
              toast.success("Duplicated");
              navigate({ to: "/admin/revenue-recovery/$key", params: { key: copy.key } } as never);
            }}
          />
          <ActionButton
            label={isPublished ? "Unpublish" : "Publish"}
            primary
            onClick={async () => {
              try {
                if (isPublished) await unpublishCalculator({ data: { id: calc.id } });
                else await publishCalculator({ data: { id: calc.id } });
                await qc.invalidateQueries({ queryKey: ["rr-calc", key] });
                toast.success(isPublished ? "Unpublished" : "Published");
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          />
        </div>
      </header>

      <nav className="mt-8 flex flex-wrap gap-1 border-b border-border">
        {(["general","questions","scoring","recommendations","report","analytics","publish"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition ${tab === t ? "border-b-2 border-ink text-ink" : "text-ink/60 hover:text-ink"}`}
          >{t}</button>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "general" && <GeneralTab data={data} />}
        {tab === "questions" && <QuestionsTab data={data} />}
        {tab === "scoring" && <ScoringTab data={data} />}
        {tab === "recommendations" && <RecommendationsTab data={data} />}
        {tab === "report" && <ReportTab data={data} />}
        {tab === "analytics" && <AnalyticsTab calculatorId={calc.id} />}
        {tab === "publish" && <PublishTab data={data} />}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">{children}</div>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-secondary text-ink/70",
    published: "bg-ink text-primary-foreground",
    archived: "bg-border text-ink/50",
  };
  return <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${map[status] ?? ""}`}>{status}</span>;
}

function ActionButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-medium transition ${
        primary ? "bg-ink text-primary-foreground hover:opacity-90" : "border border-border bg-white text-ink hover:border-ink/40"
      }`}
    >{label}</button>
  );
}

// ---------- General ----------
function GeneralTab({ data }: { data: any }) {
  const [form, setForm] = useState({
    id: data.calculator.id,
    key: data.calculator.key,
    name: data.calculator.name,
    slug: data.calculator.slug,
    tagline: data.calculator.tagline ?? "",
    description: data.calculator.description ?? "",
    outcome: data.calculator.outcome ?? "",
    industries: (data.calculator.industries ?? []).join(", "),
    settings: JSON.stringify(data.calculator.settings ?? {}, null, 2),
  });
  const [saving, setSaving] = useState(false);
  const input = "w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          let settings: Record<string, unknown> = {};
          try { settings = JSON.parse(form.settings || "{}"); } catch { toast.error("Settings must be valid JSON"); setSaving(false); return; }
          await updateCalculator({
            data: {
              id: form.id, key: form.key, name: form.name, slug: form.slug,
              tagline: form.tagline, description: form.description, outcome: form.outcome,
              industries: form.industries.split(",").map((s: string) => s.trim()).filter(Boolean),
              settings,
            },
          });
          toast.success("Saved");
        } catch (e) { toast.error((e as Error).message); }
        finally { setSaving(false); }
      }}
      className="grid max-w-2xl gap-5"
    >
      <Field label="Name"><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Slug (public URL)"><input className={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
      <Field label="Tagline"><input className={input} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
      <Field label="Description"><textarea className={`${input} min-h-[120px]`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <Field label="Outcome (short benefit)"><input className={input} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} /></Field>
      <Field label="Industries (comma separated)"><input className={input} value={form.industries} onChange={(e) => setForm({ ...form, industries: e.target.value })} /></Field>
      <Field label="Settings (JSON: ctaLabel, ctaHref, calendlyUrl, thankYouTitle, thankYouBody, leadForm)"><textarea className={`${input} min-h-[160px] font-mono text-xs`} value={form.settings} onChange={(e) => setForm({ ...form, settings: e.target.value })} /></Field>
      <div>
        <ActionButton label={saving ? "Saving…" : "Save changes"} primary onClick={() => { /* form submit */ }} />
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// ---------- Questions ----------
function QuestionsTab({ data }: { data: any }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const input = "w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink";

  function newQ() {
    setEditing({
      calculator_id: data.calculator.id,
      order_index: (data.questions.length ?? 0),
      type: "single_choice",
      key: `q_${Date.now().toString(36)}`,
      label: "",
      required: false,
      options: [],
      validation: {},
      conditions: [],
      weight: 0,
      scoring: {},
    });
  }

  async function save(q: any) {
    try {
      let options = q.options;
      if (typeof q._optionsText === "string") {
        options = q._optionsText.split("\n").filter(Boolean).map((line: string) => {
          const [value, label, score] = line.split("|").map((s) => s.trim());
          return { value, label: label ?? value, score: score ? Number(score) : undefined };
        });
      }
      await upsertQuestion({ data: {
        id: q.id, calculator_id: q.calculator_id, order_index: q.order_index,
        section: q.section ?? null, industry: q.industry ?? null,
        type: q.type, key: q.key, label: q.label, help: q.help ?? "", tooltip: q.tooltip ?? "", insight: q.insight ?? "",
        required: !!q.required, options, validation: q.validation ?? {}, conditions: q.conditions ?? [],
        weight: Number(q.weight ?? 0), scoring: q.scoring ?? {},
      } });
      await qc.invalidateQueries({ queryKey: ["rr-calc", data.calculator.key] });
      setEditing(null);
      toast.success("Question saved");
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this question?")) return;
    await deleteQuestion({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["rr-calc", data.calculator.key] });
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.questions.length} question{data.questions.length === 1 ? "" : "s"}</p>
        <ActionButton label="Add question" primary onClick={newQ} />
      </div>
      <ul className="grid gap-2">
        {data.questions.map((q: any) => (
          <li key={q.id} className="flex items-center justify-between rounded-md border border-border bg-white p-4">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{q.label || <span className="italic text-muted-foreground">Untitled</span>}</p>
              <p className="text-xs text-muted-foreground">{q.type} · {q.key}{q.section ? ` · ${q.section}` : ""}{q.industry ? ` · ${q.industry}` : ""}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing({ ...q, _optionsText: (q.options ?? []).map((o: any) => `${o.value}|${o.label}${o.score != null ? `|${o.score}` : ""}`).join("\n") })} className="text-xs font-medium text-ink hover:opacity-70">Edit</button>
              <button onClick={() => remove(q.id)} className="text-xs font-medium text-destructive hover:opacity-70">Delete</button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="rounded-lg border border-border bg-white p-6">
          <h3 className="font-serif text-2xl italic text-ink">{editing.id ? "Edit question" : "New question"}</h3>
          <div className="mt-4 grid gap-4">
            <Field label="Key (stable id)"><input className={input} value={editing.key} onChange={(e) => setEditing({ ...editing, key: e.target.value })} /></Field>
            <Field label="Label"><input className={input} value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></Field>
            <Field label="Section"><input className={input} value={editing.section ?? ""} onChange={(e) => setEditing({ ...editing, section: e.target.value })} /></Field>
            <Field label="Industry (blank = all)"><input className={input} value={editing.industry ?? ""} onChange={(e) => setEditing({ ...editing, industry: e.target.value || null })} /></Field>
            <Field label="Type">
              <select className={input} value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                {["single_choice","multi_choice","number","currency","percentage","slider","rating","yes_no","short_text","long_text"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Help text"><input className={input} value={editing.help ?? ""} onChange={(e) => setEditing({ ...editing, help: e.target.value })} /></Field>
            <Field label="Micro insight (shown under the question)"><input className={input} value={editing.insight ?? ""} onChange={(e) => setEditing({ ...editing, insight: e.target.value })} /></Field>
            <Field label="Tooltip"><input className={input} value={editing.tooltip ?? ""} onChange={(e) => setEditing({ ...editing, tooltip: e.target.value })} /></Field>
            <Field label="Order"><input type="number" className={input} value={editing.order_index ?? 0} onChange={(e) => setEditing({ ...editing, order_index: Number(e.target.value) })} /></Field>
            <Field label="Options (one per line: value|label|score)">
              <textarea className={`${input} min-h-[120px] font-mono text-xs`} value={editing._optionsText ?? ""} onChange={(e) => setEditing({ ...editing, _optionsText: e.target.value })} />
            </Field>
            <Field label="Weight"><input type="number" step="any" className={input} value={editing.weight ?? 0} onChange={(e) => setEditing({ ...editing, weight: Number(e.target.value) })} /></Field>
            <Field label="Validation (JSON)"><textarea className={`${input} min-h-[80px] font-mono text-xs`} value={JSON.stringify(editing.validation ?? {})} onChange={(e) => { try { setEditing({ ...editing, validation: JSON.parse(e.target.value || "{}") }); } catch {} }} /></Field>
            <Field label="Conditions (JSON array)"><textarea className={`${input} min-h-[80px] font-mono text-xs`} value={JSON.stringify(editing.conditions ?? [])} onChange={(e) => { try { setEditing({ ...editing, conditions: JSON.parse(e.target.value || "[]") }); } catch {} }} /></Field>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={!!editing.required} onChange={(e) => setEditing({ ...editing, required: e.target.checked })} /> Required</label>
            <div className="flex gap-2">
              <ActionButton label="Save" primary onClick={() => save(editing)} />
              <ActionButton label="Cancel" onClick={() => setEditing(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Scoring ----------
function ScoringTab({ data }: { data: any }) {
  const qc = useQueryClient();
  const initial: any = data.scoring.find((s: any) => !s.industry) ?? { calculator_id: data.calculator.id, industry: null, config: { method: "weighted_sum" } };
  const [text, setText] = useState(JSON.stringify(initial.config ?? {}, null, 2));
  const [saving, setSaving] = useState(false);
  return (
    <div className="grid gap-4">
      <p className="max-w-xl text-sm text-muted-foreground">
        Scoring rules are stored as data (weights, industry multipliers, bands, financial-impact formulas). See engine docs for supported operations (add, sub, mul, div, min, max, pct, if, coalesce, sum).
      </p>
      <textarea className="min-h-[360px] w-full rounded-md border border-border bg-white p-4 font-mono text-xs text-ink outline-none focus:border-ink" value={text} onChange={(e) => setText(e.target.value)} />
      <div>
        <ActionButton
          label={saving ? "Saving…" : "Save scoring rules"}
          primary
          onClick={async () => {
            setSaving(true);
            try {
              const config = JSON.parse(text || "{}");
              await upsertScoringRules({ data: { id: initial.id, calculator_id: data.calculator.id, industry: null, config } });
              await qc.invalidateQueries({ queryKey: ["rr-calc", data.calculator.key] });
              toast.success("Saved");
            } catch (e) { toast.error((e as Error).message); }
            finally { setSaving(false); }
          }}
        />
      </div>
    </div>
  );
}

// ---------- Recommendations ----------
function RecommendationsTab({ data }: { data: any }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const input = "w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink";

  async function save(r: any) {
    try {
      await upsertRecommendation({ data: {
        id: r.id, calculator_id: data.calculator.id, order_index: Number(r.order_index ?? 0),
        industry: r.industry || null, title: r.title, body: r.body,
        triggers: r.triggers ?? {}, cta: r.cta ?? {},
      } });
      await qc.invalidateQueries({ queryKey: ["rr-calc", data.calculator.key] });
      setEditing(null);
      toast.success("Saved");
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.recommendations.length} recommendation{data.recommendations.length === 1 ? "" : "s"}</p>
        <ActionButton label="Add recommendation" primary onClick={() => setEditing({ order_index: data.recommendations.length, title: "", body: "", triggers: {}, cta: {} })} />
      </div>
      <ul className="grid gap-2">
        {data.recommendations.map((r: any) => (
          <li key={r.id} className="flex items-center justify-between rounded-md border border-border bg-white p-4">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{r.title || <span className="italic text-muted-foreground">Untitled</span>}</p>
              <p className="truncate text-xs text-muted-foreground">{JSON.stringify(r.triggers ?? {})}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(r)} className="text-xs font-medium text-ink hover:opacity-70">Edit</button>
              <button onClick={async () => { await deleteRecommendation({ data: { id: r.id } }); await qc.invalidateQueries({ queryKey: ["rr-calc", data.calculator.key] }); }} className="text-xs font-medium text-destructive hover:opacity-70">Delete</button>
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <div className="grid gap-4 rounded-lg border border-border bg-white p-6">
          <Field label="Title"><input className={input} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
          <Field label="Body"><textarea className={`${input} min-h-[120px]`} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></Field>
          <Field label="Industry (blank = all)"><input className={input} value={editing.industry ?? ""} onChange={(e) => setEditing({ ...editing, industry: e.target.value })} /></Field>
          <Field label="Triggers (JSON: {industry, band, when})"><textarea className={`${input} min-h-[80px] font-mono text-xs`} value={JSON.stringify(editing.triggers ?? {})} onChange={(e) => { try { setEditing({ ...editing, triggers: JSON.parse(e.target.value || "{}") }); } catch {} }} /></Field>
          <Field label="CTA (JSON: {label, href})"><input className={`${input} font-mono text-xs`} value={JSON.stringify(editing.cta ?? {})} onChange={(e) => { try { setEditing({ ...editing, cta: JSON.parse(e.target.value || "{}") }); } catch {} }} /></Field>
          <div className="flex gap-2">
            <ActionButton label="Save" primary onClick={() => save(editing)} />
            <ActionButton label="Cancel" onClick={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Report ----------
function ReportTab({ data }: { data: any }) {
  return (
    <div className="max-w-2xl text-sm text-muted-foreground">
      <p>The report layout renders whatever the engine composes from your questions, scoring rules and recommendations — hero, score, financial impact, recommendations, action plan, next steps.</p>
      <p className="mt-4">Fine-grained per-section copy overrides live in the calculator <em>settings</em> JSON on the General tab. Report content will be built out per-calculator in a later phase.</p>
      {data.calculator.status === "published" && (
        <a href={`/rr/${data.calculator.slug}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-ink hover:opacity-70">
          Preview live report <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

// ---------- Analytics ----------
function AnalyticsTab({ calculatorId }: { calculatorId: string }) {
  const fn = useServerFn(getCalculatorAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["rr-analytics", calculatorId],
    queryFn: () => fn({ data: { calculator_id: calculatorId } }),
  });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const cells: [string, string | number][] = [
    ["Views", data.events.view ?? 0],
    ["Starts", data.events.start ?? 0],
    ["Completions", data.completions],
    ["Completion rate", `${Math.round((data.completionRate ?? 0) * 100)}%`],
    ["Report views", data.events.report_viewed ?? 0],
    ["PDF downloads", data.events.pdf_downloaded ?? 0],
    ["CTA clicks", data.events.cta_clicked ?? 0],
    ["Calls booked", data.events.call_booked ?? 0],
  ];
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map(([k, v]) => (
          <div key={k} className="rounded-md border border-border bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
            <p className="mt-2 font-serif text-3xl text-ink">{v}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recent submissions</p>
        <ul className="mt-3 space-y-2">
          {(data.submissions ?? []).slice(0, 10).map((s: any) => (
            <li key={s.id} className="flex items-center justify-between rounded-md border border-border bg-white p-3 text-sm">
              <span className="text-ink/80">{new Date(s.completed_at).toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">{s.industry ?? "—"} · {s.device ?? "—"}</span>
            </li>
          ))}
          {(!data.submissions || data.submissions.length === 0) && <p className="text-xs text-muted-foreground">No submissions yet.</p>}
        </ul>
      </div>
    </div>
  );
}

// ---------- Publish ----------
function PublishTab({ data }: { data: any }) {
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/rr/${data.calculator.slug}` : `/rr/${data.calculator.slug}`;
  return (
    <div className="grid max-w-2xl gap-6">
      <div className="rounded-lg border border-border bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Public link</p>
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={publicUrl} className="flex-1 rounded-md border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-ink" />
          <button
            onClick={() => { void navigator.clipboard.writeText(publicUrl); toast.success("Copied"); }}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-3 py-2 text-xs font-medium text-ink hover:border-ink/40"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Live only when the calculator status is <strong>Published</strong>. Publishing captures a snapshot; the public page only serves the latest published version.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Version history</p>
        <ul className="mt-3 space-y-2">
          {(data.versions ?? []).map((v: any) => (
            <li key={v.id} className="flex items-center justify-between rounded-md border border-border bg-white p-3 text-sm">
              <span className="text-ink">v{v.version}</span>
              <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}{v.is_published ? " · published" : ""}</span>
            </li>
          ))}
          {(!data.versions || data.versions.length === 0) && <p className="text-xs text-muted-foreground">No versions yet — publish to create one.</p>}
        </ul>
      </div>

      <div className="grid gap-2">
        <ActionButton
          label="Archive calculator"
          onClick={async () => {
            if (!confirm("Archive this calculator?")) return;
            await archiveCalculator({ data: { id: data.calculator.id } });
            toast.success("Archived");
          }}
        />
      </div>
    </div>
  );
}