import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { Answers, CalculatorConfig, ReportPayload } from "@/lib/revenue-recovery/engine/types";
import { visibleQuestions } from "@/lib/revenue-recovery/engine/branching";
import { QuestionCard } from "@/components/revenue-recovery/question-card";
import { ProgressDots } from "@/components/revenue-recovery/progress-dots";
import { LeadCaptureForm } from "@/components/revenue-recovery/lead-capture-form";
import { ReportView } from "@/components/revenue-recovery/report-view";
import { AnalysisScreen } from "@/components/revenue-recovery/analysis-screen";

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
  const { config } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const [stage, setStage] = useState<Stage>("landing");
  const [industry, setIndustry] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [milestoneIdx, setMilestoneIdx] = useState(0);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt] = useState<number>(() => Date.now());
  const sessionId = useMemo(() => Math.random().toString(36).slice(2), []);

  const visible = useMemo(() => visibleQuestions(config.questions, answers, industry), [config.questions, answers, industry]);
  const sections = useMemo(() => {
    const seen: string[] = [];
    for (const q of visible) {
      const s = q.section ?? "General";
      if (!seen.includes(s)) seen.push(s);
    }
    return seen.length ? seen : ["General"];
  }, [visible]);
  const currentSection = sections[milestoneIdx];
  const currentQuestions = visible.filter((q) => (q.section ?? "General") === currentSection);

  useEffect(() => {
    void fetch(`/api/public/rr/${slug}/event`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "view", session_id: sessionId, device: guessDevice(), referrer: document.referrer }),
    }).catch(() => {});
  }, [slug, sessionId]);

  function begin() {
    void fetch(`/api/public/rr/${slug}/event`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "start", session_id: sessionId }),
    }).catch(() => {});
    if (config.industries.length > 1) setStage("industry");
    else { setIndustry(config.industries[0] ?? null); setStage("questions"); }
  }

  function validateSection(): boolean {
    const e: Record<string, string> = {};
    for (const q of currentQuestions) {
      if (q.required) {
        const v = answers[q.key];
        if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) e[q.key] = "Required";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateSection()) return;
    if (milestoneIdx + 1 < sections.length) setMilestoneIdx(milestoneIdx + 1);
    else setStage("capture");
  }

  async function submit(contact: any) {
    setSubmitting(true);
    setStage("analyzing");
    try {
      const res = await fetch(`/api/public/rr/${slug}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers, industry, contact, session_id: sessionId,
          device: guessDevice(), referrer: document.referrer,
          duration_ms: Date.now() - startedAt,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setReport(data.report);
    } catch (e) {
      alert((e as Error).message);
      setStage("capture");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-border/60 px-6 py-5">
        <p className="font-serif text-lg italic tracking-tight">Dock</p>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        {stage === "landing" && (
          <div>
            <p className="eyebrow mb-4">{config.tagline}</p>
            <h1 className="font-serif text-5xl leading-[1.05] text-ink md:text-6xl">{config.name}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{config.description}</p>
            <button onClick={begin} className="mt-10 inline-flex rounded-md bg-ink px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
              Begin
            </button>
          </div>
        )}

        {stage === "industry" && (
          <div>
            <p className="eyebrow mb-4">Choose your industry</p>
            <h2 className="font-serif text-4xl leading-tight text-ink">Which best describes your business?</h2>
            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              {config.industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => { setIndustry(ind); setStage("questions"); }}
                  className="rounded-md border border-border bg-white px-4 py-4 text-left text-sm text-ink hover:border-ink/40"
                >{ind}</button>
              ))}
            </div>
          </div>
        )}

        {stage === "questions" && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{industry ?? "All industries"} · {currentSection}</p>
              <ProgressDots total={sections.length} current={milestoneIdx} />
            </div>
            <div className="grid gap-4">
              {currentQuestions.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
                  This calculator doesn't have any questions yet.
                </p>
              ) : currentQuestions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  value={answers[q.key] ?? null}
                  onChange={(v) => setAnswers({ ...answers, [q.key]: v })}
                  error={errors[q.key]}
                />
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => milestoneIdx === 0 ? setStage("landing") : setMilestoneIdx(milestoneIdx - 1)} className="text-sm text-ink/60 hover:text-ink">Back</button>
              <button onClick={next} className="rounded-md bg-ink px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">Continue</button>
            </div>
          </div>
        )}

        {stage === "capture" && (
          <div>
            <p className="eyebrow mb-4">Almost done</p>
            <h2 className="font-serif text-4xl leading-tight text-ink">Where should we send your report?</h2>
            <div className="mt-8 max-w-lg">
              <LeadCaptureForm
                onSubmit={submit}
                submitting={submitting}
                ctaLabel={config.settings.ctaLabel ?? "Reveal my report"}
                requirePhone={config.settings.leadForm?.requirePhone}
                requireCompany={config.settings.leadForm?.requireCompany}
                requireWebsite={config.settings.leadForm?.requireWebsite}
              />
            </div>
          </div>
        )}

        {stage === "analyzing" && <AnalysisScreen onDone={() => report && setStage("report")} />}

        {stage === "report" && report && <ReportView report={report} />}
      </main>
    </div>
  );
}

function guessDevice() {
  if (typeof navigator === "undefined") return "unknown";
  return /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop";
}