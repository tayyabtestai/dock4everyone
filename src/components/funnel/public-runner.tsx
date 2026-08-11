/**
 * The immersive funnel runner: a premium full-screen dark assessment. Drives
 * the step-by-step customer experience — one logical stage per step, live
 * conditional visibility, a 7-node progress tracker, a "generating your report"
 * transition, a reusable contact gate, then the personalised result. The score
 * is never revealed before the gate. Submission is injected (`onSubmit`) so the
 * same runner powers the public funnel (server recompute) and the builder
 * preview (client recompute).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  visibleQuestions,
  type Answers,
  type Contact,
  type EngineQuestion,
  type FunnelResult,
  type FunnelSnapshot,
  type JsonValue,
} from "@/lib/funnels/engine";
import { formatOutput } from "@/lib/funnels/engine";
import { QuestionControl } from "./question-control";
import { ResultView } from "./result-view";
import { ArrowLeft, ArrowRight, Check, Clock, Loader2, Sparkles } from "lucide-react";

export type RunnerEvent =
  | "started"
  | "question_answered"
  | "contact_gate_viewed"
  | "result_viewed"
  | "cta_clicked"
  | "recommendation_clicked";

type StageMeta = { short?: string; subtitle?: string };

type Props = {
  snapshot: FunnelSnapshot;
  onSubmit: (answers: Answers, contact: Contact) => Promise<FunnelResult>;
  onEvent?: (event: RunnerEvent, extra?: Record<string, unknown>) => void;
  onNavigateFunnel?: (slug: string) => void;
  /** Preview mode skips the artificial report-generation delay. */
  preview?: boolean;
};

const SECTION_FALLBACK = "Questions";
const REPORT_STAGE = "Generate Your Report";

const ANALYSIS_STEPS = [
  "Operational workload",
  "Automation opportunities",
  "AI readiness",
  "Potential savings",
  "Recommended systems",
];

function isAnswered(q: EngineQuestion, v: JsonValue | undefined): boolean {
  if (q.type === "multi_choice") return Array.isArray(v) && v.length > 0;
  if (v === undefined || v === null || v === "") return false;
  return true;
}

function toNum(v: JsonValue | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function PublicRunner({ snapshot, onSubmit, onEvent, onNavigateFunnel, preview }: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState<Contact>({ first_name: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FunnelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"questions" | "processing" | "gate">("questions");
  const [revealed, setRevealed] = useState(0);
  const startedRef = useRef(false);

  const industry = typeof answers.industry === "string" ? answers.industry : null;
  const stageMeta = (snapshot.settings as { stages?: Record<string, StageMeta> })?.stages ?? {};

  const { activeSections, visibleByKey } = useMemo(() => {
    const visible = visibleQuestions(snapshot.questions, answers, industry);
    const visKeys = new Set(visible.map((qq) => qq.key));
    const order: string[] = [];
    for (const qq of snapshot.questions) {
      const sec = qq.section || SECTION_FALLBACK;
      if (visKeys.has(qq.key) && !order.includes(sec)) order.push(sec);
    }
    return { activeSections: order, visibleByKey: visKeys };
  }, [snapshot.questions, answers, industry]);

  const stages = useMemo(() => [...activeSections, REPORT_STAGE], [activeSections]);
  const gateStep = activeSections.length;
  const total = stages.length;
  const onReportStage = step >= gateStep;
  const currentSection = onReportStage ? REPORT_STAGE : activeSections[step];

  const stepQuestions = useMemo(
    () =>
      onReportStage
        ? []
        : snapshot.questions.filter(
            (qq) =>
              (qq.section || SECTION_FALLBACK) === activeSections[step] && visibleByKey.has(qq.key),
          ),
    [onReportStage, snapshot.questions, activeSections, step, visibleByKey],
  );

  // Live labor-cost helper when the current step captures employees/hours/cost.
  const liveLabor = useMemo(() => {
    const keys = stepQuestions.map((qq) => qq.key);
    const has = (k: string) => keys.includes(k);
    if (has("employees") && has("hours_per_week") && has("hourly_cost")) {
      const monthly =
        toNum(answers.employees) *
        toNum(answers.hours_per_week) *
        toNum(answers.hourly_cost) *
        4.33;
      if (monthly > 0) return `Estimated monthly labor cost: ${formatOutput(monthly, "currency")}`;
    }
    return null;
  }, [stepQuestions, answers]);

  // Report-generation animation.
  useEffect(() => {
    if (phase !== "processing") return;
    if (preview || prefersReducedMotion()) {
      setRevealed(ANALYSIS_STEPS.length);
      const t = setTimeout(() => setPhase("gate"), preview ? 250 : 500);
      return () => clearTimeout(t);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    ANALYSIS_STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealed(i + 1), 450 * (i + 1)));
    });
    timers.push(setTimeout(() => setPhase("gate"), 450 * (ANALYSIS_STEPS.length + 1) + 400));
    return () => timers.forEach(clearTimeout);
  }, [phase, preview]);

  function setAnswer(key: string, value: JsonValue) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError(null);
    if (!startedRef.current) {
      startedRef.current = true;
      onEvent?.("started");
    }
  }
  function setOther(key: string, textVal: string) {
    setAnswers((prev) => ({ ...prev, [`${key}__other`]: textVal }));
  }

  function next() {
    const missing = stepQuestions.filter((qq) => qq.required && !isAnswered(qq, answers[qq.key]));
    if (missing.length) {
      setError(`Please answer: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    onEvent?.("question_answered", { section: activeSections[step] });
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep >= gateStep) {
      setRevealed(0);
      setPhase("processing");
      onEvent?.("contact_gate_viewed");
    }
    scrollTop();
  }

  function back() {
    setError(null);
    if (phase === "gate" || phase === "processing") {
      setPhase("questions");
      setStep(Math.max(0, gateStep - 1));
      return;
    }
    setStep((s) => Math.max(0, s - 1));
    scrollTop();
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
      scrollTop();
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

  const oneBased = Math.min(step, gateStep) + 1;
  const progress = Math.round((oneBased / total) * 100);
  const remaining = Math.max(1, Math.round((total - oneBased) * 0.5));
  const subtitle = stageMeta[currentSection ?? ""]?.subtitle ?? currentSection ?? "";
  const gate = snapshot.settings?.contactGate;

  return (
    <div>
      {/* Brand badge */}
      <div className="flex justify-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-indigo-500/25 to-violet-500/25 ring-1 ring-indigo-400/40">
          <Sparkles className="h-5 w-5 text-indigo-300" />
        </span>
      </div>
      <h1 className="mt-3 text-center text-[15px] font-semibold text-white">{snapshot.name}</h1>

      {/* Stepper */}
      <Stepper
        stages={stages}
        current={onReportStage ? total - 1 : step}
        shortOf={(s) => stageMeta[s]?.short ?? s}
      />

      {/* Progress */}
      <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center justify-between text-[13px]">
          <span className="min-w-0 truncate">
            <span className="font-semibold tracking-wide text-indigo-300">
              STEP {oneBased} OF {total}
            </span>
            <span className="text-white/45"> · </span>
            <span className="text-white/80">{subtitle}</span>
          </span>
          <span className="shrink-0 font-semibold text-white/80">{progress}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-white/45">
        <Clock className="h-3.5 w-3.5" /> ~ {remaining} minute{remaining === 1 ? "" : "s"} remaining
      </p>

      {/* Body */}
      <div className="mt-7">
        {phase === "processing" ? (
          <Processing revealed={revealed} />
        ) : phase === "gate" ? (
          <div>
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Your report is ready
              </p>
              <h2 className="mt-2 font-serif text-3xl leading-tight text-white">
                {gate?.headline ?? "Unlock your personalized report."}
              </h2>
              <p className="mt-2 text-sm text-white/55">
                {gate?.subhead ?? "Enter your details to reveal your results."}
              </p>
            </div>
            <div className="mx-auto max-w-md space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <GateField label="First Name" required>
                  <input
                    value={contact.first_name}
                    onChange={(e) => setContact({ ...contact, first_name: e.target.value })}
                    autoComplete="given-name"
                    className={GATE_INPUT}
                  />
                </GateField>
                {gate?.optional?.includes("last_name") && (
                  <GateField label="Last Name">
                    <input
                      value={contact.last_name ?? ""}
                      onChange={(e) => setContact({ ...contact, last_name: e.target.value })}
                      autoComplete="family-name"
                      className={GATE_INPUT}
                    />
                  </GateField>
                )}
              </div>
              <GateField label="Work Email" required>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  autoComplete="email"
                  className={GATE_INPUT}
                />
              </GateField>
              <div className="grid gap-4 sm:grid-cols-2">
                {gate?.optional?.includes("phone") && (
                  <GateField label="Phone">
                    <input
                      value={contact.phone ?? ""}
                      onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                      autoComplete="tel"
                      className={GATE_INPUT}
                    />
                  </GateField>
                )}
                {gate?.optional?.includes("company") && (
                  <GateField label="Company">
                    <input
                      value={contact.company ?? ""}
                      onChange={(e) => setContact({ ...contact, company: e.target.value })}
                      autoComplete="organization"
                      className={GATE_INPUT}
                    />
                  </GateField>
                )}
                {gate?.optional?.includes("website") && (
                  <GateField label="Website">
                    <input
                      value={contact.website ?? ""}
                      onChange={(e) => setContact({ ...contact, website: e.target.value })}
                      autoComplete="url"
                      className={GATE_INPUT}
                    />
                  </GateField>
                )}
                {gate?.optional?.includes("job_title") && (
                  <GateField label="Job Title">
                    <input
                      value={contact.job_title ?? ""}
                      onChange={(e) => setContact({ ...contact, job_title: e.target.value })}
                      autoComplete="organization-title"
                      className={GATE_INPUT}
                    />
                  </GateField>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-center font-serif text-[28px] font-medium leading-tight text-white sm:text-[32px]">
              {stepQuestions[0]?.label}
            </h2>
            {stepQuestions[0]?.help ? (
              <p className="mx-auto mt-3 max-w-md text-center text-sm text-white/55">
                {stepQuestions[0].help}
              </p>
            ) : null}

            <div className="mt-7 space-y-7">
              {stepQuestions.map((qq, i) => (
                <div key={qq.key}>
                  {i > 0 && (
                    <label className="mb-3 block text-center text-lg font-medium text-white">
                      {qq.label}
                      {qq.required ? <span className="text-indigo-300"> *</span> : null}
                      {qq.help ? (
                        <span className="mt-1 block text-sm font-normal text-white/55">
                          {qq.help}
                        </span>
                      ) : null}
                    </label>
                  )}
                  <QuestionControl
                    question={qq}
                    value={answers[qq.key]}
                    otherText={
                      typeof answers[`${qq.key}__other`] === "string"
                        ? (answers[`${qq.key}__other`] as string)
                        : ""
                    }
                    onChange={(v) => setAnswer(qq.key, v)}
                    onOther={(t) => setOther(qq.key, t)}
                  />
                  {qq.insight ? (
                    <p className="mt-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-center text-xs text-white/60">
                      {qq.insight}
                    </p>
                  ) : null}
                </div>
              ))}
              {liveLabor ? (
                <p className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-4 py-3 text-center text-sm font-medium text-indigo-200">
                  {liveLabor}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {error ? <p className="mt-6 text-center text-sm text-rose-400">{error}</p> : null}

      {/* Nav */}
      {phase !== "processing" && (
        <div className="mt-8">
          {phase === "gate" ? (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4 text-[15px] font-semibold text-white shadow-[0_16px_40px_-16px_rgba(99,102,241,0.9)] transition hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Generating…" : "Unlock My Personalized Report"}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4 text-[15px] font-semibold text-white shadow-[0_16px_40px_-16px_rgba(99,102,241,0.9)] transition hover:brightness-110"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={back}
              disabled={step === 0 && phase === "questions"}
              className="inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white disabled:opacity-0"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function scrollTop() {
  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
}

function Stepper({
  stages,
  current,
  shortOf,
}: {
  stages: string[];
  current: number;
  shortOf: (s: string) => string;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-start">
        {stages.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={s + i} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span
                  className={`h-[2px] flex-1 ${i === 0 ? "opacity-0" : done || active ? "bg-indigo-500" : "bg-white/12"}`}
                />
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition ${
                    done
                      ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
                      : active
                        ? "bg-indigo-500 text-white ring-4 ring-indigo-500/25"
                        : "border border-white/20 bg-transparent text-white/40"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={`h-[2px] flex-1 ${i === stages.length - 1 ? "opacity-0" : done ? "bg-indigo-500" : "bg-white/12"}`}
                />
              </div>
              <span
                className={`mt-1.5 hidden text-center text-[10px] leading-tight sm:block ${active ? "text-white" : "text-white/40"}`}
              >
                {shortOf(s)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Processing({ revealed }: { revealed: number }) {
  const done = revealed >= ANALYSIS_STEPS.length;
  return (
    <div className="py-6 text-center">
      <div className="flex justify-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo-500/25 to-violet-500/25 ring-1 ring-indigo-400/40">
          {done ? (
            <Check className="h-6 w-6 text-indigo-300" strokeWidth={2.5} />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
          )}
        </span>
      </div>
      <h2 className="mt-4 font-serif text-3xl text-white">
        {done ? "Your report is ready." : "We've analyzed your responses."}
      </h2>
      <p className="mt-2 text-sm text-white/55">
        {done ? "Preparing your personalized results…" : "Building your personalized report…"}
      </p>
      <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left">
        {ANALYSIS_STEPS.map((label, i) => {
          const shown = i < revealed;
          return (
            <li
              key={label}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all duration-300 ${
                shown
                  ? "border-white/10 bg-white/[0.04] text-white/85 opacity-100"
                  : "border-white/5 bg-transparent text-white/30 opacity-40"
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${shown ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white" : "border border-white/20"}`}
              >
                {shown ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const GATE_INPUT =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder-white/35 outline-none transition-colors focus:border-indigo-400/60";

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
    <label className="block text-left">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
