import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPublicAssessment, submitAssessment, trackAssessmentEvent } from "@/lib/assessments.functions";
import type { Question, Formula, ResultConfig, LeadFields, RecommendationRule } from "@/lib/assessment-engine/types";
import { evaluateFormulas, formatValue, renderTokens, applyRecommendations } from "@/lib/assessment-engine/evaluator";
import { toast } from "sonner";

export const Route = createFileRoute("/assessment/$slug")({
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

function PublicAssessment() {
  const a = Route.useLoaderData() as any;
  const submit = useServerFn(submitAssessment);
  const track = useServerFn(trackAssessmentEvent);

  const questions: Question[] = a.questions ?? [];
  const formulas: Formula[] = a.formulas ?? [];
  const rc: ResultConfig = a.result_config ?? {};
  const lf: LeadFields = a.lead_fields ?? {};
  const recs: RecommendationRule[] = a.ai_recommendations ?? [];

  const totalSteps = questions.length + (anyLead(lf) ? 1 : 0);
  const storageKey = STORAGE_PREFIX + a.slug;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [lead, setLead] = useState<Record<string, any>>({});
  const [consent, setConsent] = useState(false);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    track({ data: { assessment_id: a.id, event: "view" } }).catch(() => {});
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) { const s = JSON.parse(raw); if (s.answers) setAnswers(s.answers); if (typeof s.step === "number") setStep(s.step); if (s.lead) setLead(s.lead); }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ answers, step, lead })); } catch {}
  }, [answers, step, lead]);

  function begin() {
    setStarted(true); setStartedAt(Date.now());
    track({ data: { assessment_id: a.id, event: "start" } }).catch(() => {});
  }

  const currentQ = questions[step];
  const onLeadStep = anyLead(lf) && step === questions.length;

  function next() {
    if (currentQ?.required) {
      const v = answers[currentQ.id];
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
        toast.error(currentQ.errorMessage || "This question is required."); return;
      }
    }
    if (step + 1 < totalSteps) setStep(step + 1);
  }
  function back() { if (step > 0) setStep(step - 1); }

  async function finalize() {
    setSubmitting(true);
    try {
      if (anyLead(lf)) {
        if (lf.name && !lead.name) throw new Error("Name required");
        if (lf.email && !lead.email) throw new Error("Email required");
        if (lf.consent && !consent) throw new Error("Please accept the consent");
      }
      const r = await submit({ data: {
        assessment_id: a.id, answers, lead,
        time_seconds: startedAt ? Math.round((Date.now() - startedAt) / 1000) : null,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        landing_page: typeof window !== "undefined" ? window.location.href : "",
      } });
      setResult(r);
      try { localStorage.removeItem(storageKey); } catch {}
    } catch (e: any) { toast.error(e.message || "Could not submit"); }
    finally { setSubmitting(false); }
  }

  const liveComputed = useMemo(() => evaluateFormulas(formulas, answers), [answers, formulas]);

  if (result) return <ResultView a={a} rc={rc} formulas={formulas} computed={result.computed ?? liveComputed} recs={result.recommendations ?? applyRecommendations(recs, result.computed ?? liveComputed)} />;

  if (!started) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto max-w-3xl px-6 py-24 md:py-32 text-center">
          <p className="eyebrow mb-4">{a.industry || "Assessment"}</p>
          <h1 className="font-serif text-5xl leading-tight md:text-6xl">{a.headline || a.name}</h1>
          {a.subheadline && <p className="mt-4 font-serif text-2xl italic text-muted-foreground">{a.subheadline}</p>}
          {a.description && <p className="mx-auto mt-6 max-w-xl text-sm text-muted-foreground">{a.description}</p>}
          <div className="mt-10 flex items-center justify-center gap-3">
            <button onClick={begin} className="rounded-full bg-ink px-6 py-3 text-sm text-primary-foreground hover:opacity-90">
              {a.primary_cta_label || "Start"}
            </button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">~ {a.estimated_minutes || 3} min · {questions.length} question{questions.length === 1 ? "" : "s"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <div className="mb-8">
          <div className="h-[2px] w-full overflow-hidden rounded bg-border">
            <div className="h-full bg-ink transition-[width]" style={{ width: `${((step + 1) / Math.max(totalSteps, 1)) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Step {step + 1} of {totalSteps}</p>
        </div>

        {!onLeadStep && currentQ && (
          <div>
            <h2 className="font-serif text-3xl leading-tight md:text-4xl">{currentQ.title}{currentQ.required && <span className="text-muted-foreground"> *</span>}</h2>
            {currentQ.description && <p className="mt-2 text-sm text-muted-foreground">{currentQ.description}</p>}
            <div className="mt-6"><QuestionInput q={currentQ} value={answers[currentQ.id]} onChange={(v) => setAnswers((s) => ({ ...s, [currentQ.id]: v }))} /></div>
            {currentQ.helpText && <p className="mt-2 text-xs text-muted-foreground">{currentQ.helpText}</p>}
          </div>
        )}

        {onLeadStep && (
          <div>
            <h2 className="font-serif text-3xl leading-tight md:text-4xl">Where should we send your results?</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
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

        <div className="mt-10 flex items-center justify-between">
          <button onClick={back} disabled={step === 0} className="text-sm text-muted-foreground hover:text-ink disabled:opacity-40">← Previous</button>
          {step + 1 < totalSteps ? (
            <button onClick={next} className="rounded-full bg-ink px-6 py-3 text-sm text-primary-foreground hover:opacity-90">Next →</button>
          ) : (
            <button onClick={finalize} disabled={submitting} className="rounded-full bg-ink px-6 py-3 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {submitting ? "Submitting…" : "See my result"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function anyLead(lf: LeadFields) {
  return !!(lf.name || lf.email || lf.phone || lf.company || lf.industry || lf.job_title || lf.team_size || lf.country);
}

function LeadInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ink" />
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
      <div className="flex gap-2">
        {["yes", "no"].map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`flex-1 rounded-md border px-4 py-3 text-sm capitalize ${value === o ? "border-ink bg-ink text-primary-foreground" : "border-border bg-white hover:border-ink/40"}`}>{o}</button>
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
      <div className="space-y-2">
        {(q.options ?? []).map((o) => (
          <button key={o.value} onClick={() => onChange(o.value)} className={`block w-full rounded-md border px-4 py-3 text-left text-sm ${value === o.value ? "border-ink bg-secondary" : "border-border bg-white hover:border-ink/40"}`}>{o.label}</button>
        ))}
      </div>
    );
    case "checkbox": {
      const arr: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {(q.options ?? []).map((o) => {
            const on = arr.includes(o.value);
            return (
              <button key={o.value} onClick={() => onChange(on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                className={`block w-full rounded-md border px-4 py-3 text-left text-sm ${on ? "border-ink bg-secondary" : "border-border bg-white hover:border-ink/40"}`}>{o.label}</button>
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
          <button key={n} onClick={() => onChange(n)} className={`h-12 w-12 rounded-md border text-lg ${value >= n ? "border-ink bg-ink text-primary-foreground" : "border-border bg-white hover:border-ink/40"}`}>{n}</button>
        ))}
      </div>
    );
    case "file_upload": return <p className="text-sm text-muted-foreground">File upload coming soon.</p>;
    default: return <input type="text" placeholder={q.placeholder} className={cls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

function ResultView({ a, rc, formulas, computed, recs }: { a: any; rc: ResultConfig; formulas: Formula[]; computed: Record<string, number>; recs: any[] }) {
  const headline = renderTokens(rc.headline || "Your result", computed, formulas);
  const summary = rc.summary ? renderTokens(rc.summary, computed, formulas) : "";
  const valueVar = rc.valueVar;
  const format = formulas.find((f) => f.id === valueVar)?.format;
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
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