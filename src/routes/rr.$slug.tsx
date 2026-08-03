import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Answer, Answers, CalculatorConfig, ReportPayload } from "@/lib/revenue-recovery/engine/types";
import { visibleQuestions } from "@/lib/revenue-recovery/engine/branching";
import { computeScore } from "@/lib/revenue-recovery/engine/scoring";
import { validateAnswer } from "@/lib/revenue-recovery/engine/validation";
import { QuestionCard } from "@/components/revenue-recovery/question-card";
import { ProgressDots } from "@/components/revenue-recovery/progress-dots";
import { ProgressMessage } from "@/components/revenue-recovery/progress-message";
import { LeadCaptureForm, type LeadForm } from "@/components/revenue-recovery/lead-capture-form";
import { ReportView } from "@/components/revenue-recovery/report-view";
import { AnalysisScreen } from "@/components/revenue-recovery/analysis-screen";
import { Guide, type GuidePose } from "@/components/revenue-recovery/guide";
import { clearProgress, loadProgress, resolveExperience, saveProgress } from "@/lib/revenue-recovery/experience";

export const Route = createFileRoute("/rr/$slug")({
  ssr: false,
  loader: async ({ params }) => {
    const res = await fetch(`/api/public/rr/${params.slug}/config`);
    if (res.status === 404) throw notFound();
    if (!res.ok) throw new Error(`Failed to load calculator (${res.status})`);
    return (await res.json()) as { config: CalculatorConfig; calculatorId: string; versionId: string };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.config.name} — Dock` },
      { name: "description", content: loaderData.config.tagline || loaderData.config.description },
      { property: "og:title", content: loaderData.config.name },
      { property: "og:description", content: loaderData.config.tagline || loaderData.config.description },
    ] : [{ title: "Calculator — Dock" }],
  }),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="font-serif text-3xl italic text-ink">Something went wrong.</p>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="font-serif text-3xl italic text-ink">This page isn't available.</p>
      <p className="mt-2 text-sm text-muted-foreground">The calculator you're looking for may not be published yet.</p>
    </div>
  ),
  component: PublicCalculator,
});

type Stage = "landing" | "industry" | "questions" | "capture" | "analyzing" | "report";

function PublicCalculator() {
  const { config } = Route.useLoaderData() as { config: CalculatorConfig };
  const { slug } = Route.useParams();
  const exp = useMemo(() => resolveExperience(config), [config]);

  const [stage, setStage] = useState<Stage>("landing");
  const [industry, setIndustry] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [businessName, setBusinessName] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [resume, setResume] = useState<{ industry: string | null; answers: Answers } | null>(null);
  const [exitPrompt, setExitPrompt] = useState(false);
  const [startedAt] = useState<number>(() => Date.now());
  const sessionId = useMemo(() => Math.random().toString(36).slice(2), []);
  const reportRef = useRef<ReportPayload | null>(null);
  reportRef.current = report;

  const visible = useMemo(
    () => visibleQuestions(config.questions, answers, industry),
    [config.questions, answers, industry],
  );
  const sections = useMemo(() => {
    const seen: string[] = [];
    for (const q of visible) {
      const s = q.section ?? "General";
      if (!seen.includes(s)) seen.push(s);
    }
    return seen;
  }, [visible]);

  const current = visible[Math.min(cursor, Math.max(visible.length - 1, 0))];
  const currentSection = current?.section ?? sections[0] ?? "";
  const milestoneIdx = Math.max(0, sections.indexOf(currentSection));

  // live opportunity signal — direction only, never the formula
  const liveScore = useMemo(
    () => (exp.liveEstimate.enabled ? computeScore(config, answers, industry).score : 0),
    [config, answers, industry, exp.liveEstimate.enabled],
  );
  const prevScore = useRef(0);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  useEffect(() => {
    if (!exp.liveEstimate.enabled) return;
    if (liveScore > prevScore.current) setLiveNote("Estimated opportunity increasing");
    else if (liveScore < prevScore.current) setLiveNote(exp.liveEstimate.label);
    prevScore.current = liveScore;
  }, [liveScore, exp.liveEstimate]);

  const track = useCallback(
    (event: string, payload?: Record<string, unknown>) => {
      void fetch(`/api/public/rr/${slug}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event, session_id: sessionId, device: guessDevice(),
          referrer: typeof document === "undefined" ? undefined : document.referrer,
          payload,
        }),
      }).catch(() => {});
    },
    [slug, sessionId],
  );

  useEffect(() => { track("view"); }, [track]);

  useEffect(() => {
    const saved = loadProgress(slug);
    if (saved && Object.keys(saved.answers ?? {}).length) {
      setResume({ industry: saved.industry ?? null, answers: saved.answers as Answers });
    }
  }, [slug]);

  // autosave
  useEffect(() => {
    if (stage !== "questions") return;
    saveProgress(slug, { industry, answers: answers as Record<string, unknown>, stepKey: current?.key });
  }, [slug, stage, industry, answers, current?.key]);

  // exit protection
  useEffect(() => {
    if (stage !== "questions" && stage !== "capture") return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stage]);

  function begin(prefill?: { industry: string | null; answers: Answers }) {
    track("start");
    if (prefill) { setAnswers(prefill.answers); setIndustry(prefill.industry); }
    setResume(null);
    if (prefill?.industry) { setStage("questions"); return; }
    if (config.industries.length > 1) setStage("industry");
    else { setIndustry(config.industries[0] ?? null); setStage("questions"); }
  }

  function setAnswer(v: Answer) {
    if (!current) return;
    setError(null);
    setAnswers((a) => ({ ...a, [current.key]: v }));
  }

  function next() {
    if (!current) { setStage("capture"); return; }
    const err = validateAnswer(current, answers[current.key] ?? null);
    if (err) { setError(err); return; }
    if (cursor + 1 < visible.length) setCursor(cursor + 1);
    else { track("questions_complete"); setStage("capture"); }
  }

  function back() {
    setError(null);
    if (cursor === 0) setExitPrompt(true);
    else setCursor(cursor - 1);
  }

  async function submit(contact: LeadForm) {
    setBusinessName(contact.company);
    setSubmitting(true);
    setStage("analyzing");
    try {
      const res = await fetch(`/api/public/rr/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers, industry, contact, session_id: sessionId,
          device: guessDevice(), referrer: document.referrer,
          duration_ms: Date.now() - startedAt,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setReport(data.report);
      clearProgress(slug);
      track("complete");
    } catch (e) {
      setError((e as Error).message);
      setStage("capture");
    } finally {
      setSubmitting(false);
    }
  }

  const pose: GuidePose = stage === "landing" ? "welcome" : liveScore > prevScore.current ? "concern" : "encourage";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-border/60 px-6 py-5 print:hidden">
        <p className="font-serif text-lg italic tracking-tight">Dock</p>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        {stage === "landing" && (
          <div className="animate-in fade-in duration-700">
            {exp.landing.eyebrow && <p className="eyebrow mb-4">{exp.landing.eyebrow}</p>}
            <h1 className="font-serif text-5xl leading-[1.05] text-ink md:text-6xl">{exp.landing.headline}</h1>
            {exp.landing.subheadline && (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{exp.landing.subheadline}</p>
            )}
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                onClick={() => begin()}
                className="inline-flex rounded-md bg-ink px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                {exp.landing.primaryCta}
              </button>
              {exp.landing.secondaryCta && exp.landing.secondaryCtaHref && (
                <a
                  href={exp.landing.secondaryCtaHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-md border border-border px-6 py-3 text-sm font-medium text-ink transition hover:border-ink/40"
                >
                  {exp.landing.secondaryCta}
                </a>
              )}
            </div>
            {resume && (
              <div className="mt-8 rounded-lg border border-border bg-white p-5">
                <p className="text-sm text-ink">You have an analysis in progress.</p>
                <div className="mt-3 flex gap-4 text-sm">
                  <button onClick={() => begin(resume)} className="font-medium text-ink underline underline-offset-4">Resume</button>
                  <button onClick={() => { clearProgress(slug); setResume(null); }} className="text-muted-foreground hover:text-ink">Start over</button>
                </div>
              </div>
            )}
            <Guide pose="welcome" size="lg" className="mt-12" message={config.tagline || undefined} />
          </div>
        )}

        {stage === "industry" && (
          <div className="animate-in fade-in duration-500">
            <p className="eyebrow mb-4">Choose your industry</p>
            <h2 className="font-serif text-4xl leading-tight text-ink">{exp.industryPrompt}</h2>
            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              {config.industries.map((ind: string) => (
                <button
                  key={ind}
                  onClick={() => { setIndustry(ind); setStage("questions"); }}
                  className="rounded-md border border-border bg-white px-4 py-4 text-left text-sm text-ink transition hover:border-ink/40"
                >{ind}</button>
              ))}
            </div>
          </div>
        )}

        {stage === "questions" && (
          <div>
            <div className="mb-10 flex items-center justify-between gap-6">
              <div>
                <ProgressMessage messages={exp.progressMessages} index={cursor} />
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {industry ?? "All industries"}{currentSection ? ` · ${currentSection}` : ""}
                </p>
              </div>
              {sections.length > 1 && <ProgressDots total={sections.length} current={milestoneIdx} />}
            </div>

            {!current ? (
              <p className="rounded-md border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
                This calculator doesn't have any questions yet.
              </p>
            ) : (
              <div key={current.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <QuestionCard
                  question={current}
                  value={answers[current.key] ?? null}
                  onChange={setAnswer}
                  error={error ?? undefined}
                />
                {exp.liveEstimate.enabled && liveNote && Object.keys(answers).length > 0 && (
                  <p key={liveNote} className="mt-4 animate-in fade-in text-[11px] uppercase tracking-[0.16em] text-muted-foreground duration-500">
                    {liveNote}
                  </p>
                )}
                <Guide pose={pose} size="sm" className="mt-8" />
              </div>
            )}

            <div className="mt-10 flex items-center justify-between">
              <button onClick={back} className="text-sm text-ink/60 transition hover:text-ink">Back</button>
              <button
                onClick={next}
                className="rounded-md bg-ink px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {stage === "capture" && (
          <div className="animate-in fade-in duration-500">
            <p className="eyebrow mb-4">Almost done</p>
            <h2 className="font-serif text-4xl leading-tight text-ink">{exp.leadForm.title}</h2>
            {exp.leadForm.subtitle && <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{exp.leadForm.subtitle}</p>}
            {error && <p className="mt-4 text-xs font-medium text-destructive">{error}</p>}
            <div className="mt-8 max-w-lg">
              <LeadCaptureForm
                onSubmit={submit}
                submitting={submitting}
                ctaLabel={exp.leadForm.submitLabel}
                requirePhone={exp.leadForm.requirePhone}
                requireCompany={exp.leadForm.requireCompany}
                requireWebsite={exp.leadForm.requireWebsite}
                consentText={exp.leadForm.consentText}
              />
            </div>
          </div>
        )}

        {stage === "analyzing" && (
          <AnalysisScreen
            headline={exp.analysis.headline}
            lines={exp.analysis.lines}
            durationMs={exp.analysis.durationMs}
            onDone={() => { if (reportRef.current) setStage("report"); }}
          />
        )}

        {stage === "report" && report && (
          <ReportView report={report} layout={exp.report} businessName={businessName} />
        )}
      </main>

      {exitPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6 print:hidden">
          <div className="w-full max-w-md rounded-lg border border-border bg-white p-8">
            <h3 className="font-serif text-2xl leading-snug text-ink">Leave your analysis?</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Your answers are saved on this device, so you can pick up where you left off.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setExitPrompt(false)} className="text-sm text-ink/60 hover:text-ink">Keep going</button>
              <button
                onClick={() => { setExitPrompt(false); setStage("landing"); }}
                className="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function guessDevice() {
  if (typeof navigator === "undefined") return "unknown";
  return /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop";
}