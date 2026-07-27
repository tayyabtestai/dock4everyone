import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPublicAssessment, submitAssessment, trackAssessmentEvent } from "@/lib/assessments.functions";
import type { Question, Formula, ResultConfig, LeadFields, RecommendationRule } from "@/lib/assessment-engine/types";
import { evaluateFormulas, formatValue, renderTokens, applyRecommendations } from "@/lib/assessment-engine/evaluator";
import { toast } from "sonner";
import guideClipboard from "@/assets/guide-clipboard.png";
import guideCharts from "@/assets/guide-charts.png";
import guideAnalytics from "@/assets/guide-analytics.png";
import guideMagnifier from "@/assets/guide-magnifier.png";
import guidePlanning from "@/assets/guide-planning.png";
import guideLaptop from "@/assets/guide-laptop.png";
import guideReport from "@/assets/guide-report.png";

export const Route = createFileRoute("/assessment/")({
  loader: async ({ params }) => {
    try {
      const data = await getPublicAssessment({ data: { slug: params.slug } });
      return data;
    } catch { throw notFound(); }
  },
  head: ({ loaderData }) => {
    const a: any = loaderData;
    if (!a) return { meta: [{ title: "Assessment" }, { name: "robots", content: "noindex" }] };
    const title = a.seo_title || a.headline || a.name;
    const desc = a.seo_description || a.description || "";
    const meta: any[] = [
      { title }, { name: "description", content: desc },
      { property: "og:title", content: title }, { property: "og:description", content: desc },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ];
    if (a.og_image_url) { meta.push({ property: "og:image", content: a.og_image_url }, { name: "twitter:image", content: a.og_image_url }); }
    return { meta };
  },
  component: PublicAssessment,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
      <div><p className="eyebrow mb-3">404</p><h1 className="font-serif text-4xl">Assessment not found</h1></div>
    </div>
  ),
});

const STORAGE_PREFIX = "dock.assessment.";
const GUIDE_POSES = [guideClipboard, guideCharts, guideAnalytics, guideMagnifier, guidePlanning];
const ENCOURAGERS = ["Great.", "Perfect.", "Thanks.", "Nice.", "Interesting.", "Got it.", "Noted."];

const INDUSTRY_MAP: Record<string, { label: string; noun: string }> = {
  dental: { label: "Dental Practice", noun: "patients" },
  dentist: { label: "Dental Practice", noun: "patients" },
  medical: { label: "Medical Clinic", noun: "patients" },
  clinic: { label: "Medical Clinic", noun: "patients" },
  health: { label: "Healthcare", noun: "patients" },
  law: { label: "Law Firm", noun: "clients" },
  legal: { label: "Law Firm", noun: "clients" },
  "real estate": { label: "Real Estate", noun: "home buyers" },
  realtor: { label: "Real Estate", noun: "home buyers" },
  property: { label: "Real Estate", noun: "home buyers" },
  insurance: { label: "Insurance", noun: "policy holders" },
  plumb: { label: "Plumbing Company", noun: "homeowners" },
  hvac: { label: "HVAC Business", noun: "homeowners" },
  agency: { label: "Marketing Agency", noun: "clients" },
  marketing: { label: "Marketing Agency", noun: "clients" },
  salon: { label: "Salon", noun: "guests" },
  gym: { label: "Gym", noun: "members" },
  fitness: { label: "Fitness Studio", noun: "members" },
  saas: { label: "SaaS Company", noun: "users" },
  software: { label: "Software", noun: "users" },
  construction: { label: "Construction", noun: "clients" },
  restaurant: { label: "Restaurant", noun: "guests" },
  finance: { label: "Financial Services", noun: "clients" },
  bank: { label: "Financial Services", noun: "clients" },
  accounting: { label: "Accounting", noun: "clients" },
  ecommerce: { label: "E-commerce", noun: "shoppers" },
  shop: { label: "E-commerce", noun: "shoppers" },
};

function industryProfile(raw: string | undefined): { eyebrow: string; noun: string } {
  const key = (raw || "").toLowerCase().trim();
  if (!key) return { eyebrow: "Assessment", noun: "customers" };
  for (const [needle, val] of Object.entries(INDUSTRY_MAP)) {
    if (key.includes(needle)) return { eyebrow: val.label.toUpperCase(), noun: val.noun };
  }
  return { eyebrow: key.toUpperCase(), noun: "customers" };
}

type Step =
  | { kind: "question"; question: Question; milestoneIndex: number }
  | { kind: "interstitial"; milestoneIndex: number; toMilestone: string }
  | { kind: "lead"; milestoneIndex: number };

function buildMilestones(questions: Question[]): { name: string }[] {
  if (!questions.length) return [];
  const out: { name: string }[] = [];
  let prev = "";
  for (const q of questions) {
    const name = q.section?.trim() || "Assessment";
    if (name !== prev) { out.push({ name }); prev = name; }
  }
  return out;
}

function buildSteps(questions: Question[], hasLead: boolean): { steps: Step[]; milestones: { name: string }[] } {
  const milestones = buildMilestones(questions);
  // If lead capture is on and only one milestone, treat "Your details" as an extra milestone
  const displayMilestones = hasLead ? [...milestones, { name: "Your details" }] : milestones;
  const steps: Step[] = [];
  let mIdx = -1;
  let prev = "";
  for (const q of questions) {
    const name = q.section?.trim() || "Assessment";
    if (name !== prev) {
      mIdx += 1;
      if (mIdx > 0) steps.push({ kind: "interstitial", milestoneIndex: mIdx, toMilestone: name });
      prev = name;
    }
    steps.push({ kind: "question", question: q, milestoneIndex: mIdx });
  }
  if (hasLead) steps.push({ kind: "lead", milestoneIndex: displayMilestones.length - 1 });
  return { steps, milestones: displayMilestones };
}

function guideForMilestone(idx: number, hint?: string): string {
  const h = (hint || "").toLowerCase();
  if (h.includes("your details") || h.includes("details")) return guideReport;
  if (h.includes("customer") || h.includes("acqu") || h.includes("attract") || h.includes("lead")) return guideCharts;
  if (h.includes("operat") || h.includes("team") || h.includes("process")) return guideAnalytics;
  if (h.includes("revenue") || h.includes("leak") || h.includes("loss")) return guideMagnifier;
  if (h.includes("growth") || h.includes("goal") || h.includes("future")) return guidePlanning;
  if (h.includes("snapshot") || h.includes("about") || h.includes("business")) return guideClipboard;
  return GUIDE_POSES[idx % GUIDE_POSES.length];
}

function messageForMilestone(name: string, idx: number, total: number): string {
  const low = name.toLowerCase();
  if (low.includes("your details")) return "Done. Where should I send your personalized report?";
  if (low.includes("customer") || low.includes("attract")) return "Interesting — let's see how customers usually find you.";
  if (low.includes("operat") || low.includes("team")) return "Now let's understand how your team handles new enquiries.";
  if (low.includes("revenue") || low.includes("leak")) return "I think I'm already spotting a few opportunities.";
  if (low.includes("growth") || low.includes("goal")) return "Almost finished. One final section before I build your report.";
  if (idx === 0) return "Great. Let's get to know your business first.";
  if (idx === total - 1) return "Almost finished. One final section before I build your report.";
  return "Nice. A few more questions before I put your report together.";
}

function personalize(text: string, noun: string): string {
  if (!text) return text;
  return text.replace(/\{\{\s*customers?\s*\}\}/gi, noun);
}

function anyLead(lf: LeadFields) {
  return !!(lf.name || lf.email || lf.phone || lf.company || lf.industry || lf.job_title || lf.team_size || lf.country);
}

function PublicAssessment() {
  const a = Route.useLoaderData() as any;
  const submit = useServerFn(submitAssessment);
  const track = useServerFn(trackAssessmentEvent);

  const questions: Question[] = a.questions ?? [];
  const formulas: Formula[] = a.formulas ?? [];
  const rc: ResultConfig = a.result_config ?? {};
  const lf: LeadFields = a.lead_fields ?? {};
  const recs: RecommendationRule[] = a.ai_recommendations ?? [];
  const industry = useMemo(() => industryProfile(a.industry), [a.industry]);
  const hasLead = anyLead(lf);
  const { steps, milestones } = useMemo(() => buildSteps(questions, hasLead), [questions, hasLead]);

  const storageKey = STORAGE_PREFIX + a.slug;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [lead, setLead] = useState<Record<string, any>>({});
  const [consent, setConsent] = useState(false);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const encTimer = useRef<any>(null);

  useEffect(() => {
    track({ data: { assessment_id: a.id, event: "view" } }).catch(() => {});
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) { const s = JSON.parse(raw); if (s.answers) setAnswers(s.answers); if (typeof s.step === "number") setStep(Math.min(s.step, Math.max(0, (steps?.length ?? 1) - 1))); if (s.lead) setLead(s.lead); }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ answers, step, lead })); } catch {}
  }, [answers, step, lead]);

  useEffect(() => {
    if (!started || result) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [started, result]);

  function begin() {
    setStarted(true); setStartedAt(Date.now());
    track({ data: { assessment_id: a.id, event: "start" } }).catch(() => {});
  }

  const current = steps[step];
  const currentMilestoneIndex = current ? current.milestoneIndex : 0;

  function flashEncouragement() {
    const msg = ENCOURAGERS[Math.floor(Math.random() * ENCOURAGERS.length)];
    setEncouragement(msg);
    if (encTimer.current) clearTimeout(encTimer.current);
    encTimer.current = setTimeout(() => setEncouragement(null), 1400);
  }

  function next() {
    if (current?.kind === "question" && current.question.required) {
      const q = current.question;
      const v = answers[q.id];
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
        toast.error(q.errorMessage || "This question is required."); return;
      }
    }
    if (current?.kind === "question") flashEncouragement();
    if (step + 1 < steps.length) setStep(step + 1);
  }
  function back() { if (step > 0) setStep(step - 1); }

  async function finalize() {
    setSubmitting(true);
    try {
      if (hasLead) {
        if (lf.name && !lead.name) throw new Error("Name required");
        if (lf.email && !lead.email) throw new Error("Email required");
        if (lf.consent && !consent) throw new Error("Please accept the consent");
      }
      setAnalyzing(true);
      await new Promise((r) => setTimeout(r, 1600));
      const r = await submit({ data: {
        assessment_id: a.id, answers, lead,
        time_seconds: startedAt ? Math.round((Date.now() - startedAt) / 1000) : null,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        landing_page: typeof window !== "undefined" ? window.location.href : "",
      } });
      setResult(r);
      try { localStorage.removeItem(storageKey); } catch {}
    } catch (e: any) { setAnalyzing(false); toast.error(e.message || "Could not submit"); }
    finally { setSubmitting(false); }
  }

  const liveComputed = useMemo(() => evaluateFormulas(formulas, answers), [answers, formulas]);

  if (result) return <ResultView a={a} rc={rc} formulas={formulas} computed={result.computed ?? liveComputed} recs={result.recommendations ?? applyRecommendations(recs, result.computed ?? liveComputed)} industry={industry.eyebrow} />;

  if (analyzing) return <AnalyzingView industry={industry.eyebrow} />;

  if (!started) {
    return (
      <div className="min-h-screen bg-canvas text-ink animate-fade-in">
        <div className="mx-auto max-w-3xl px-6 py-24 md:py-32 text-center">
          <p className="eyebrow mb-4">{industry.eyebrow}</p>
          <h1 className="font-serif text-5xl leading-tight md:text-6xl">{a.headline || a.name}</h1>
          {a.subheadline && <p className="mt-4 font-serif text-2xl italic text-muted-foreground">{a.subheadline}</p>}
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground">
            {a.description || "Answer a few quick questions and discover where your business may be losing revenue — and how AI could help recover it."}
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <button onClick={begin} className="rounded-full bg-ink px-8 py-3.5 text-sm text-primary-foreground transition-all hover:opacity-90 hover:scale-[1.02]">
              {a.primary_cta_label || "Start Assessment"}
            </button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Takes about {a.estimated_minutes || 3} minutes</p>
        </div>
      </div>
    );
  }

  const guideSrc = guideForMilestone(currentMilestoneIndex, milestones[currentMilestoneIndex]?.name);
  const advisorMsg = current?.kind === "interstitial"
    ? messageForMilestone(current.toMilestone, current.milestoneIndex, milestones.length)
    : messageForMilestone(milestones[currentMilestoneIndex]?.name || "", currentMilestoneIndex, milestones.length);

  const isLastStep = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-5xl px-6 pt-10 md:pt-14">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">{industry.eyebrow}</p>
          <MilestoneBar milestones={milestones} current={currentMilestoneIndex} />
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 pb-32 pt-10 md:grid-cols-[220px_1fr] md:pt-16">
        <aside className="hidden md:block">
          <div key={`guide-${currentMilestoneIndex}-${current?.kind}`} className="animate-fade-in">
            <img src={guideSrc} alt="Your AI business consultant" width={220} height={220} loading="lazy" className="h-auto w-full rounded-2xl bg-secondary/40 object-contain" />
            <p className="mt-4 font-serif text-base italic leading-snug text-muted-foreground">{advisorMsg}</p>
          </div>
        </aside>

        <div key={`step-${step}`} className="animate-fade-in">
          {current?.kind === "question" && (
            <div>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">
                {personalize(current.question.title, industry.noun)}
                {current.question.required && <span className="text-muted-foreground"> *</span>}
              </h2>
              {current.question.description && (
                <p className="mt-3 text-sm text-muted-foreground">{personalize(current.question.description, industry.noun)}</p>
              )}
              <div className="mt-8">
                <QuestionInput q={current.question} value={answers[current.question.id]} onChange={(v) => setAnswers((s) => ({ ...s, [current.question.id]: v }))} />
              </div>
              {current.question.helpText && <p className="mt-3 text-xs text-muted-foreground">{current.question.helpText}</p>}
            </div>
          )}

          {current?.kind === "interstitial" && (
            <div className="max-w-xl">
              <p className="eyebrow mb-4">Next</p>
              <h2 className="font-serif text-4xl leading-tight md:text-5xl">{current.toMilestone}</h2>
              <p className="mt-5 font-serif text-xl italic text-muted-foreground">{advisorMsg}</p>
            </div>
          )}

          {current?.kind === "lead" && (
            <div>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Where should I send your report?</h2>
              <p className="mt-3 text-sm text-muted-foreground">A quick detail so your personalized results reach the right place.</p>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {lf.name && <LeadInput label="Name" value={lead.name ?? ""} onChange={(v) => setLead((s) => ({ ...s, name: v }))} />}
                {lf.email && <LeadInput label="Email" type="email" value={lead.email ?? ""} onChange={(v) => setLead((s) => ({ ...s, email: v }))} />}
                {lf.phone && <LeadInput label="Phone" value={lead.phone ?? ""} onChange={(v) => setLead((s) => ({ ...s, phone: v }))} />}
                {lf.company && <LeadInput label="Company" value={lead.company ?? ""} onChange={(v) => setLead((s) => ({ ...s, company: v }))} />}
                {lf.industry && <LeadInput label="Industry" value={lead.industry ?? ""} onChange={(v) => setLead((s) => ({ ...s, industry: v }))} />}
                {lf.job_title && <LeadInput label="Job title" value={lead.job_title ?? ""} onChange={(v) => setLead((s) => ({ ...s, job_title: v }))} />}
                {lf.team_size && <LeadInput label="Team size" value={lead.team_size ?? ""} onChange={(v) => setLead((s) => ({ ...s, team_size: v }))} />}
                {lf.country && <LeadInput label="Country" value={lead.country ?? ""} onChange={(v) => setLead((s) => ({ ...s, country: v }))} />}
              </div>
              {lf.consent && (
                <label className="mt-6 flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                  <span>{lf.consent_text || "I agree to be contacted with results and follow-ups."}</span>
                </label>
              )}
              {lf.privacy_notice && <p className="mt-3 text-xs text-muted-foreground">{lf.privacy_notice}</p>}
            </div>
          )}

          {encouragement && (
            <p key={encouragement + step} className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground animate-fade-in">{encouragement}</p>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <button onClick={back} disabled={step === 0} className="text-sm text-muted-foreground transition hover:text-ink disabled:opacity-40">← Previous</button>
          {isLastStep && current?.kind === "lead" ? (
            <button onClick={finalize} disabled={submitting} className="rounded-full bg-ink px-8 py-3 text-sm text-primary-foreground transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-50">
              {submitting ? "Preparing…" : "See my report →"}
            </button>
          ) : isLastStep ? (
            <button onClick={finalize} disabled={submitting} className="rounded-full bg-ink px-8 py-3 text-sm text-primary-foreground transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-50">
              {submitting ? "Preparing…" : "See my report →"}
            </button>
          ) : (
            <button onClick={next} className="rounded-full bg-ink px-8 py-3 text-sm text-primary-foreground transition-all hover:opacity-90 hover:scale-[1.02]">Continue →</button>
          )}
        </div>
      </div>
    </div>
  );
}

function MilestoneBar({ milestones, current }: { milestones: { name: string }[]; current: number }) {
  if (milestones.length <= 1) return <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">In progress</span>;
  return (
    <div className="flex items-center gap-3">
      {milestones.map((m, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <div key={m.name + i} className="flex items-center gap-2">
            <span className={`h-1.5 rounded-full transition-all ${active ? "w-6 bg-ink" : done ? "w-1.5 bg-ink/60" : "w-1.5 bg-border"}`} />
            <span className={`hidden text-[10px] font-semibold uppercase tracking-[0.2em] md:inline ${active ? "text-ink" : "text-muted-foreground"}`}>{m.name}</span>
          </div>
        );
      })}
    </div>
  );
}

function AnalyzingView({ industry }: { industry: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center animate-fade-in">
      <div className="max-w-md">
        <p className="eyebrow mb-6">{industry}</p>
        <img src={guideLaptop} alt="Analyzing" width={280} height={280} className="mx-auto h-auto w-64 rounded-2xl bg-secondary/40 object-contain" />
        <h1 className="mt-8 font-serif text-4xl leading-tight md:text-5xl">Analyzing your business…</h1>
        <p className="mt-4 font-serif text-lg italic text-muted-foreground">Cross-referencing your answers and preparing your personalized report.</p>
        <div className="mx-auto mt-8 h-[2px] w-40 overflow-hidden rounded bg-border">
          <div className="h-full w-1/3 animate-[slide-in-right_1.4s_ease-in-out_infinite] bg-ink" />
        </div>
      </div>
    </div>
  );
}

function LeadInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink" />
    </label>
  );
}

function QuestionInput({ q, value, onChange }: { q: Question; value: any; onChange: (v: any) => void }) {
  const cls = "w-full rounded-md border border-border bg-white px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-ink";
  switch (q.type) {
    case "long_text": return <textarea rows={4} placeholder={q.placeholder} className={cls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "number": case "currency": case "percentage":
      return <input type="number" placeholder={q.placeholder} className={cls} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))} />;
    case "email": return <input type="email" placeholder={q.placeholder} className={cls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "phone": return <input type="tel" placeholder={q.placeholder} className={cls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "website": return <input type="url" placeholder={q.placeholder} className={cls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "date": return <input type="date" className={cls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "yes_no": return (
      <div className="flex gap-3">
        {["yes", "no"].map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`flex-1 rounded-lg border px-4 py-4 text-base capitalize transition-all hover:-translate-y-0.5 ${value === o ? "border-ink bg-ink text-primary-foreground shadow-sm" : "border-border bg-white hover:border-ink/40"}`}>{o}</button>
        ))}
      </div>
    );
    case "dropdown": return (
      <select className={cls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {(q.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
    case "radio": case "multiple_choice": return (
      <div className="space-y-2.5">
        {(q.options ?? []).map((o) => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3.5 text-left text-base transition-all hover:-translate-y-0.5 ${value === o.value ? "border-ink bg-secondary shadow-sm" : "border-border bg-white hover:border-ink/40"}`}>
            <span>{o.label}</span>
            <span className={`ml-3 grid h-5 w-5 place-items-center rounded-full border text-[10px] ${value === o.value ? "border-ink bg-ink text-primary-foreground" : "border-border"}`}>{value === o.value ? "✓" : ""}</span>
          </button>
        ))}
      </div>
    );
    case "checkbox": {
      const arr: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2.5">
          {(q.options ?? []).map((o) => {
            const on = arr.includes(o.value);
            return (
              <button key={o.value} onClick={() => onChange(on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3.5 text-left text-base transition-all hover:-translate-y-0.5 ${on ? "border-ink bg-secondary shadow-sm" : "border-border bg-white hover:border-ink/40"}`}>
                <span>{o.label}</span>
                <span className={`ml-3 grid h-5 w-5 place-items-center rounded border text-[10px] ${on ? "border-ink bg-ink text-primary-foreground" : "border-border"}`}>{on ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>
      );
    }
    case "slider": return (
      <div>
        <input type="range" min={q.min ?? 0} max={q.max ?? 100} step={q.step ?? 1} value={value ?? q.min ?? 0} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
        <p className="mt-2 font-mono text-sm text-ink">{value ?? q.min ?? 0}</p>
      </div>
    );
    case "rating": return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(n)} className={`h-12 w-12 rounded-md border text-lg transition-all hover:-translate-y-0.5 ${value >= n ? "border-ink bg-ink text-primary-foreground" : "border-border bg-white hover:border-ink/40"}`}>{n}</button>
        ))}
      </div>
    );
    case "file_upload": return <p className="text-sm text-muted-foreground">File upload coming soon.</p>;
    default: return <input type="text" placeholder={q.placeholder} className={cls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

function ResultView({ a, rc, formulas, computed, recs, industry }: { a: any; rc: ResultConfig; formulas: Formula[]; computed: Record<string, number>; recs: any[]; industry: string }) {
  const headline = renderTokens(rc.headline || "Your result", computed, formulas);
  const summary = rc.summary ? renderTokens(rc.summary, computed, formulas) : "";
  const valueVar = rc.valueVar;
  const format = formulas.find((f) => f.id === valueVar)?.format;
  return (
    <div className="min-h-screen bg-canvas text-ink animate-fade-in">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <div className="mb-8 flex items-center gap-4">
          <img src={guideReport} alt="Report ready" width={72} height={72} className="h-16 w-16 rounded-xl bg-secondary/40 object-contain" />
          <div>
            <p className="eyebrow">{industry}</p>
            <p className="mt-1 font-serif text-base italic text-muted-foreground">Done. Your personalized business report is ready.</p>
          </div>
        </div>
        {rc.success_message && <p className="eyebrow mb-4">{rc.success_message}</p>}
        <h1 className="font-serif text-5xl leading-tight md:text-6xl">{headline}</h1>
        {valueVar && <p className="mt-6 font-serif text-6xl italic">{formatValue(computed[valueVar] ?? 0, format)}</p>}
        {summary && <p className="mt-6 max-w-xl text-base text-muted-foreground">{summary}</p>}

        {recs.length > 0 && (
          <section className="mt-14">
            <p className="eyebrow mb-4">Recommendations</p>
            <div className="space-y-4">
              {recs.map((r: any) => (
                <div key={r.id} className="rounded-lg border border-border bg-white p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-serif text-xl">{renderTokens(r.title, computed, formulas)}</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{r.priority}</span>
                  </div>
                  {r.body && <p className="mt-2 text-sm text-muted-foreground">{renderTokens(r.body, computed, formulas)}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-14 flex flex-wrap gap-3">
          {rc.primary_cta_url && <a href={rc.primary_cta_url} className="rounded-full bg-ink px-6 py-3 text-sm text-primary-foreground hover:opacity-90">{rc.primary_cta_label || "Continue"}</a>}
          {rc.secondary_cta_url && <a href={rc.secondary_cta_url} className="rounded-full border border-border bg-white px-6 py-3 text-sm hover:border-ink/40">{rc.secondary_cta_label || "Learn more"}</a>}
        </div>
      </div>
    </div>
  );
}
