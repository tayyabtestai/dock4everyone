import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Eye,
  Save,
  Send,
  ExternalLink,
} from "lucide-react";
import {
  adminGetFunnelForEdit,
  adminSaveFunnel,
  adminPublishFunnel,
} from "@/lib/funnels/admin.functions";
import { FUNNEL_INDUSTRY_OPTIONS } from "@/lib/funnels/taxonomy";
import { Select } from "@/components/admin/lead-form";
import { PublicRunner } from "@/components/funnel/public-runner";
import {
  buildResult,
  type Answers,
  type Contact,
  type EngineOption,
  type EngineQuestion,
  type FunnelSnapshot,
  type QuestionType,
} from "@/lib/funnels/engine";

export const Route = createFileRoute("/_authenticated/admin/funnels/$id")({
  head: () => ({
    meta: [{ title: "Funnel Builder — Dock" }, { name: "robots", content: "noindex" }],
  }),
  component: BuilderPage,
});

type EditFunnel = {
  id: string;
  key: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  industries: string[];
  settings: Record<string, unknown>;
  questions: EngineQuestion[];
  scoringRules: FunnelSnapshot["scoringRules"];
  recommendations: FunnelSnapshot["recommendations"];
  status: string;
  publishedVersion: number | null;
};

const GOALS = [
  "Generate Leads",
  "Qualify Leads",
  "Calculate ROI",
  "Diagnose Problems",
  "Recommend Solutions",
  "Book Consultation",
];

const QUESTION_TYPES: Record<QuestionType, string> = {
  single_choice: "Single choice",
  multi_choice: "Multiple choice",
  number: "Number",
  currency: "Currency",
  percentage: "Percentage",
  slider: "Slider",
  rating: "Rating",
  yes_no: "Yes / No",
  short_text: "Short text",
  long_text: "Long text",
};

const CHOICE_TYPES = new Set<QuestionType>(["single_choice", "multi_choice"]);

function keyFromLabel(label: string, existing: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "field";
  let k = base;
  let i = 2;
  while (existing.has(k)) k = `${base}_${i++}`;
  return k;
}

function BuilderPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const getFn = useServerFn(adminGetFunnelForEdit);
  const saveFn = useServerFn(adminSaveFunnel);
  const publishFn = useServerFn(adminPublishFunnel);

  const q = useQuery({
    queryKey: ["admin", "funnel-edit", id],
    queryFn: () => getFn({ data: { id } }),
    staleTime: 0,
  });

  const [tab, setTab] = useState<"details" | "questions" | "preview">("details");
  const [model, setModel] = useState<EditFunnel | null>(null);

  useEffect(() => {
    if (q.data) setModel(q.data as EditFunnel);
  }, [q.data]);

  const saveMut = useMutation({
    mutationFn: (m: EditFunnel) =>
      saveFn({
        data: {
          id: m.id,
          name: m.name,
          description: m.description,
          tagline: m.tagline,
          slug: m.slug,
          industries: m.industries,
          settings: m.settings,
          questions: m.questions as unknown as Record<string, unknown>[],
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishMut = useMutation({
    mutationFn: async (m: EditFunnel) => {
      await saveFn({
        data: {
          id: m.id,
          name: m.name,
          description: m.description,
          tagline: m.tagline,
          slug: m.slug,
          industries: m.industries,
          settings: m.settings,
          questions: m.questions as unknown as Record<string, unknown>[],
        },
      });
      return publishFn({ data: { id: m.id } });
    },
    onSuccess: (r) => {
      toast.success(`Published (v${r.version})`);
      qc.invalidateQueries({ queryKey: ["admin"] });
      q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading || !model) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="h-8 w-64 animate-pulse rounded bg-secondary" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-destructive">
          Could not load this funnel. {(q.error as Error).message}
        </p>
        <Link to="/admin/funnels" className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to Funnels
        </Link>
      </div>
    );
  }

  const set = (patch: Partial<EditFunnel>) => setModel({ ...model, ...patch });
  const setSetting = (patch: Record<string, unknown>) =>
    set({ settings: { ...model.settings, ...patch } });

  const primaryIndustry = model.industries[0] ?? "All Industries";
  const goal = (model.settings.goal as string) ?? "";
  const cta = (model.settings.cta as { url?: string; label?: string }) ?? {};
  const gate = (model.settings.contactGate as { headline?: string; subhead?: string }) ?? {};

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/admin/funnels" })}
            className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="eyebrow">Funnel Builder</p>
            <h1 className="font-serif text-2xl leading-tight">{model.name}</h1>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
            {model.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {model.status === "published" && (
            <a
              href={`/funnel/${model.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              <ExternalLink className="h-4 w-4" /> Open
            </a>
          )}
          <button
            onClick={() => saveMut.mutate(model)}
            disabled={saveMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {saveMut.isPending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => publishMut.mutate(model)}
            disabled={publishMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {publishMut.isPending ? "Publishing…" : "Save & Publish"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-xl border border-border bg-card p-1">
        {(["details", "questions", "preview"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm capitalize transition-colors ${
              tab === t
                ? "bg-secondary font-medium text-ink"
                : "text-muted-foreground hover:text-ink"
            }`}
          >
            {t === "preview" && <Eye className="h-3.5 w-3.5" />}
            {t}
            {t === "questions" && (
              <span className="rounded-full bg-accent/15 px-1.5 text-[11px] text-accent">
                {model.questions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "details" && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <FieldRow label="Funnel name">
              <input
                value={model.name}
                onChange={(e) => set({ name: e.target.value })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
              />
            </FieldRow>
            <FieldRow label="Description">
              <textarea
                value={model.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
              />
            </FieldRow>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Public slug">
                <div className="flex items-center rounded-lg border border-border bg-white px-3 py-2 text-sm">
                  <span className="text-muted-foreground">/funnel/</span>
                  <input
                    value={model.slug}
                    onChange={(e) =>
                      set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
                    }
                    className="min-w-0 flex-1 bg-transparent outline-none"
                  />
                </div>
              </FieldRow>
              <FieldRow label="Target industry">
                <Select
                  value={primaryIndustry}
                  onChange={(v) => set({ industries: v === "All Industries" ? [] : [v] })}
                  options={FUNNEL_INDUSTRY_OPTIONS as unknown as string[]}
                />
              </FieldRow>
              <FieldRow label="Goal">
                <Select value={goal} onChange={(v) => setSetting({ goal: v })} options={GOALS} />
              </FieldRow>
              <FieldRow label="CTA — Calendly / link URL">
                <input
                  value={cta.url ?? ""}
                  onChange={(e) =>
                    setSetting({ cta: { ...cta, type: "calendly", url: e.target.value } })
                  }
                  placeholder="https://calendly.com/…"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
                />
              </FieldRow>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Contact gate headline">
                <input
                  value={gate.headline ?? ""}
                  onChange={(e) =>
                    setSetting({ contactGate: { ...gate, headline: e.target.value } })
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
                />
              </FieldRow>
              <FieldRow label="Contact gate subhead">
                <input
                  value={gate.subhead ?? ""}
                  onChange={(e) =>
                    setSetting({ contactGate: { ...gate, subhead: e.target.value } })
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
                />
              </FieldRow>
            </div>
          </div>
        )}

        {tab === "questions" && (
          <QuestionsEditor
            questions={model.questions}
            onChange={(questions) => set({ questions })}
          />
        )}

        {tab === "preview" && <BuilderPreview model={model} />}
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/* ---------- Questions editor ---------- */

function QuestionsEditor({
  questions,
  onChange,
}: {
  questions: EngineQuestion[];
  onChange: (q: EngineQuestion[]) => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const update = (i: number, patch: Partial<EngineQuestion>) => {
    const next = questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q));
    onChange(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  const remove = (i: number) => onChange(questions.filter((_, idx) => idx !== i));
  const duplicate = (i: number) => {
    const src = questions[i]!;
    const existing = new Set(questions.map((x) => x.key));
    const copy = { ...src, key: keyFromLabel(src.label + " copy", existing), id: undefined };
    const next = [...questions];
    next.splice(i + 1, 0, copy);
    onChange(next);
  };
  const add = () => {
    const existing = new Set(questions.map((x) => x.key));
    const nq: EngineQuestion = {
      key: keyFromLabel("new question", existing),
      type: "single_choice",
      label: "New question",
      required: false,
      industry: null,
      options: [
        { value: "option_1", label: "Option 1" },
        { value: "option_2", label: "Option 2" },
      ],
      conditions: [],
      weight: 0,
      scoring: { mode: "none" },
    };
    onChange([...questions, nq]);
    setOpenIdx(questions.length);
  };

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={q.key + i} className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="flex flex-col">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-muted-foreground hover:text-ink disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === questions.length - 1}
                className="text-muted-foreground hover:text-ink disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-medium text-ink">{q.label || "(untitled)"}</p>
              <p className="text-xs text-muted-foreground">
                {QUESTION_TYPES[q.type]}
                {q.required ? " · required" : ""}
                {q.industry ? ` · ${q.industry}` : ""}
              </p>
            </button>
            <button
              onClick={() => duplicate(i)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
              aria-label="Duplicate"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => remove(i)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {openIdx === i && (
            <div className="space-y-3 border-t border-border px-4 py-4">
              <FieldRow label="Question">
                <input
                  value={q.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
                />
              </FieldRow>
              <div className="grid gap-3 sm:grid-cols-3">
                <FieldRow label="Type">
                  <Select
                    value={q.type}
                    onChange={(v) => update(i, { type: v as QuestionType })}
                    options={Object.keys(QUESTION_TYPES)}
                    labels={QUESTION_TYPES}
                  />
                </FieldRow>
                <FieldRow label="Industry targeting">
                  <Select
                    value={q.industry ?? "All Industries"}
                    onChange={(v) => update(i, { industry: v === "All Industries" ? null : v })}
                    options={FUNNEL_INDUSTRY_OPTIONS as unknown as string[]}
                  />
                </FieldRow>
                <FieldRow label="Section (step)">
                  <input
                    value={q.section ?? ""}
                    onChange={(e) => update(i, { section: e.target.value })}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
                  />
                </FieldRow>
              </div>
              <FieldRow label="Help text">
                <input
                  value={q.help ?? ""}
                  onChange={(e) => update(i, { help: e.target.value })}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
                />
              </FieldRow>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                />
                Required
              </label>

              {CHOICE_TYPES.has(q.type) && (
                <OptionsEditor
                  options={q.options}
                  scoringOn={q.scoring.mode === "options"}
                  onScoringToggle={(on) =>
                    update(i, { scoring: { mode: on ? "options" : "none" } })
                  }
                  onChange={(options) => update(i, { options })}
                />
              )}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-accent/50 hover:text-ink"
      >
        <Plus className="h-4 w-4" /> Add question
      </button>
    </div>
  );
}

function OptionsEditor({
  options,
  scoringOn,
  onScoringToggle,
  onChange,
}: {
  options: EngineOption[];
  scoringOn: boolean;
  onScoringToggle: (on: boolean) => void;
  onChange: (o: EngineOption[]) => void;
}) {
  const update = (i: number, patch: Partial<EngineOption>) =>
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i));
  const add = () => onChange([...options, { value: `option_${options.length + 1}`, label: "" }]);

  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Options
        </span>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={scoringOn}
            onChange={(e) => onScoringToggle(e.target.checked)}
          />
          Score by option points
        </label>
      </div>
      <div className="space-y-2">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={o.label}
              onChange={(e) => {
                const label = e.target.value;
                update(i, {
                  label,
                  value: o.value || label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                });
              }}
              placeholder="Option label"
              className="min-w-0 flex-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-ink/40"
            />
            {scoringOn && (
              <input
                type="number"
                value={o.points ?? 0}
                onChange={(e) => update(i, { points: Number(e.target.value) })}
                className="w-20 rounded-md border border-border bg-white px-2 py-1.5 text-sm outline-none focus:border-ink/40"
                aria-label="Points"
              />
            )}
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={!!o.isOther}
                onChange={(e) => update(i, { isOther: e.target.checked })}
              />
              Other
            </label>
            <button
              onClick={() => remove(i)}
              className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-white hover:text-destructive"
              aria-label="Remove option"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
      >
        <Plus className="h-3 w-3" /> Add option
      </button>
    </div>
  );
}

/* ---------- Preview ---------- */

function BuilderPreview({ model }: { model: EditFunnel }) {
  const snapshot: FunnelSnapshot = useMemo(
    () => ({
      id: model.id,
      key: model.key,
      slug: model.slug,
      name: model.name,
      tagline: model.tagline,
      description: model.description,
      industries: model.industries,
      settings: model.settings as FunnelSnapshot["settings"],
      questions: model.questions,
      scoringRules: model.scoringRules,
      recommendations: model.recommendations,
    }),
    [model],
  );

  async function previewSubmit(answers: Answers, _contact: Contact) {
    const industry = typeof answers.industry === "string" ? answers.industry : null;
    return buildResult(snapshot, answers, industry);
  }

  return (
    <div className="rounded-2xl border border-border bg-[#05060a] p-4 sm:p-6">
      <p className="mb-4 text-center text-xs text-white/40">
        Live preview — scoring, logic and results run client-side. No lead is created.
      </p>
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/[0.08] bg-[#0b0d14] p-5 sm:p-7">
        <PublicRunner snapshot={snapshot} onSubmit={previewSubmit} preview />
      </div>
    </div>
  );
}
