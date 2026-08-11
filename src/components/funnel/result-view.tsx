/**
 * Personalised funnel result, immersive dark theme. Shows the score + band, any
 * calculated financial outputs (clearly labelled estimates), the primary
 * opportunity + recommended service, cross-funnel recommendations (each with its
 * reason), and the CTA. Reused by the public funnel and the builder preview.
 */
import { formatOutput, type FunnelResult } from "@/lib/funnels/engine";
import { Calendar, ArrowRight, TrendingUp } from "lucide-react";

type Props = {
  result: FunnelResult;
  funnelName: string;
  onCta?: () => void;
  onRecommendation?: (slug: string, title: string) => void;
};

export function ResultView({ result, funnelName, onCta, onRecommendation }: Props) {
  const { score, outputs, recommendations, cta } = result;
  const hasFinancials = outputs.length > 0;

  return (
    <div className="space-y-7">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
          Your personalized report
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-white sm:text-4xl">
          {funnelName}
        </h1>
      </header>

      {/* Score */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-7 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
          {result.scoreLabel}
        </p>
        <div className="mt-2 flex items-end justify-center gap-1">
          <span className="bg-gradient-to-br from-indigo-300 to-violet-300 bg-clip-text font-serif text-6xl leading-none text-transparent">
            {score.normalized}
          </span>
          <span className="mb-1 text-lg text-white/40">/ 100</span>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-3 py-1 text-sm font-medium text-indigo-200 ring-1 ring-indigo-400/30">
          <TrendingUp className="h-3.5 w-3.5" />
          {score.band.label}
        </div>
      </div>

      {(result.primary || result.recommendedService || result.secondary) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.primary && <Panel label="Primary Opportunity" value={result.primary} />}
          {result.secondary && <Panel label="Secondary" value={result.secondary} />}
          {result.recommendedService && (
            <Panel label="Recommended System" value={result.recommendedService} />
          )}
        </div>
      )}

      {hasFinancials && (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {outputs.map((o) => (
              <div key={o.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {o.label}
                </p>
                <p className="mt-1 font-serif text-2xl text-white">
                  {formatOutput(o.value, o.format)}
                </p>
                {o.period ? <p className="text-xs text-white/40">{o.period}</p> : null}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-white/40">
            Figures are estimates based on the information you provided, not a guarantee.
          </p>
        </div>
      )}

      {cta?.url && (
        <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-6 text-center">
          <h2 className="font-serif text-2xl text-white">Ready to move forward?</h2>
          <a
            href={cta.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onCta}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-medium text-white shadow-[0_16px_40px_-16px_rgba(99,102,241,0.9)] hover:brightness-110"
          >
            <Calendar className="h-4 w-4" />
            {cta.label ?? "Book a Strategy Call"}
          </a>
        </div>
      )}

      {recommendations.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Recommended for you
          </p>
          <div className="space-y-3">
            {recommendations.slice(0, 3).map((r, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-medium text-white">{r.title}</h3>
                  <p className="mt-1 text-sm text-white/55">{r.reason}</p>
                </div>
                {r.cta?.type === "funnel" && r.cta.slug ? (
                  <button
                    type="button"
                    onClick={() => onRecommendation?.(r.cta.slug!, r.title)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    {r.cta.label ?? "Take Assessment"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : r.cta?.url ? (
                  <a
                    href={r.cta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    {r.cta.label ?? "Learn more"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</p>
      <p className="mt-1 text-base text-white">{value}</p>
    </div>
  );
}
