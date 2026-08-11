/**
 * The funnel runner: drives the step-by-step public experience — one logical
 * section per step, live conditional visibility, a reusable contact gate, then
 * the personalised result. Submission is injected (`onSubmit`) so the same
 * runner powers both the public funnel (server recompute) and the builder
 * preview (client recompute).
 */
import { useMemo, useState } from "react";
import {
  visibleQuestions,
  type Answers,
  type Contact,
  type EngineQuestion,
  type FunnelResult,
  type FunnelSnapshot,
  type JsonValue,
} from "@/lib/funnels/engine";
import { QuestionControl } from "./question-control";
import { ResultView } from "./result-view";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

export type RunnerEvent =
  | "started"
  | "question_answered"
  | "contact_gate_viewed"
  | "result_viewed"
  | "cta_clicked"
  | "recommendation_clicked";

type Props = {
  snapshot: FunnelSnapshot;
  onSubmit: (answers: Answers, contact: Contact) => Promise<FunnelResult>;
  onEvent?: (event: RunnerEvent, extra?: Record<string, unknown>) => void;
  onNavigateFunnel?: (slug: string) => void;
};

const SECTION_FALLBACK = "Questions";

function isAnswered(q: EngineQuestion, v: JsonValue | undefined): boolean {
  if (q.type === "multi_choice") return Array.isArray(v) && v.length > 0;
  if (v === undefined || v === null || v === "") return false;
  return true;
}

export function PublicRunner({ snapshot, onSubmit, onEvent, onNavigateFunnel }: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState<Contact>({ first_name: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FunnelResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const industry = typeof answers.industry === "string" ? answers.industry : null;

  const { activeSections, visibleByKey } = useMemo(() => {
    const visible = visibleQuestions(snapshot.questions, answers, industry);
    const visKeys = new Set(visible.map((q) => q.key));
    const order: string[] = [];
    for (const q of snapshot.questions) {
      const s = q.section || SECTION_FALLBACK;
      if (visKeys.has(q.key) && !order.includes(s)) order.push(s);
    }
    return { activeSections: order, visibleByKey: visKeys };
  }, [snapshot.questions, answers, industry]);

  const gateStep = activeSections.length;
  const totalSteps = gateStep + 1;
  const onGate = step >= gateStep;

  const stepQuestions = onGate
    ? []
    : snapshot.questions.filter(
        (q) => (q.section || SECTION_FALLBACK) === activeSections[step] && visibleByKey.has(q.key),
      );

  function setAnswer(key: string, value: JsonValue) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }
  function setOther(key: string, textVal: string) {
    setAnswers((prev) => ({ ...prev, [`${key}__other`]: textVal }));
  }

  function next() {
    const missing = stepQuestions.filter((q) => q.required && !isAnswered(q, answers[q.key]));
    if (missing.length) {
      setError(`Please answer: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    onEvent?.("question_answered", { section: activeSections[step] });
    if (step === 0 && Object.keys(answers).length) onEvent?.("started");
    const nextStep = step + 1;
    if (nextStep >= gateStep) onEvent?.("contact_gate_viewed");
    setStep(nextStep);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    if (!contact.first_name.trim() || !contact.email.trim()) {
      setError("First name and work email are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await onSubmit(answers, contact);
      setResult(r);
      onEvent?.("result_viewed", { score: r.score.normalized });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <ResultView
        result={result}
        funnelName={snapshot.name}
        onCta={() => onEvent?.("cta_clicked")}
        onRecommendation={(slug, title) => {
          onEvent?.("recommendation_clicked", { slug, title });
          onNavigateFunnel?.(slug);
        }}
      />
    );
  }

  const gate = snapshot.settings?.contactGate;
  const progress = Math.round(((Math.min(step, gateStep) + 1) / (totalSteps + 1)) * 100);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {Math.min(step, gateStep) + 1} of {totalSteps}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {onGate ? (
        <div>
          <p className="eyebrow mb-2 text-accent">Almost there</p>
          <h2 className="font-serif text-3xl text-ink">
            {gate?.headline ?? "Your result is ready."}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {gate?.subhead ?? "Enter your details to unlock your personalised report."}
          </p>
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <GateField label="First Name" required>
                <input
                  value={contact.first_name}
                  onChange={(e) => setContact({ ...contact, first_name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
                />
              </GateField>
              {gate?.optional?.includes("last_name") && (
                <GateField label="Last Name">
                  <input
                    value={contact.last_name ?? ""}
                    onChange={(e) => setContact({ ...contact, last_name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
                  />
                </GateField>
              )}
            </div>
            <GateField label="Work Email" required>
              <input
                type="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
              />
            </GateField>
            <div className="grid gap-4 sm:grid-cols-2">
              {gate?.optional?.includes("phone") && (
                <GateField label="Phone">
                  <input
                    value={contact.phone ?? ""}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
                  />
                </GateField>
              )}
              {gate?.optional?.includes("company") && (
                <GateField label="Company">
                  <input
                    value={contact.company ?? ""}
                    onChange={(e) => setContact({ ...contact, company: e.target.value })}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
                  />
                </GateField>
              )}
              {gate?.optional?.includes("website") && (
                <GateField label="Website">
                  <input
                    value={contact.website ?? ""}
                    onChange={(e) => setContact({ ...contact, website: e.target.value })}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
                  />
                </GateField>
              )}
              {gate?.optional?.includes("job_title") && (
                <GateField label="Job Title">
                  <input
                    value={contact.job_title ?? ""}
                    onChange={(e) => setContact({ ...contact, job_title: e.target.value })}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
                  />
                </GateField>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="eyebrow mb-4 text-muted-foreground">{activeSections[step]}</p>
          <div className="space-y-8">
            {stepQuestions.map((q) => (
              <div key={q.key}>
                <label className="block text-lg font-medium text-ink">
                  {q.label}
                  {q.required ? <span className="text-accent"> *</span> : null}
                </label>
                {q.help ? <p className="mt-1 text-sm text-muted-foreground">{q.help}</p> : null}
                <div className="mt-3">
                  <QuestionControl
                    question={q}
                    value={answers[q.key]}
                    otherText={
                      typeof answers[`${q.key}__other`] === "string"
                        ? (answers[`${q.key}__other`] as string)
                        : ""
                    }
                    onChange={(v) => setAnswer(q.key, v)}
                    onOther={(t) => setOther(q.key, t)}
                  />
                </div>
                {q.insight ? (
                  <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                    {q.insight}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-ink disabled:opacity-0"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {onGate ? (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Generating…" : "Unlock my report"}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function GateField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
