/**
 * Personalised funnel result. Shows the score + qualification band, any
 * calculated financial outputs (clearly labelled estimates), the primary
 * opportunity and recommended service, cross-funnel recommendations (each with
 * its reason), and the CTA. Reused by the public funnel and the builder preview.
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
    <div className="space-y-8">
      <header className="text-center">
        <p className="eyebrow mb-2 text-accent">Your result</p>
        <h1 className="font-serif text-4xl leading-tight text-ink md:text-5xl">{funnelName}</h1>
      </header>

      {/* Score */}
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {result.scoreLabel}
        </p>
        <div className="mt-2 flex items-end justify-center gap-1">
          <span className="font-serif text-6xl leading-none text-ink">{score.normalized}</span>
          <span className="mb-1 text-lg text-muted-foreground">/ 100</span>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
          <TrendingUp className="h-3.5 w-3.5" />
          {score.band.label}
        </div>
      </div>

      {/* Primary / recommended service */}
      {(result.primary || result.recommendedService || result.secondary) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {result.primary && <Panel label="Primary Opportunity" value={result.primary} />}
          {result.secondary && <Panel label="Secondary" value={result.secondary} />}
          {result.recommendedService && (
            <Panel label="Recommended System" value={result.recommendedService} />
          )}
        </div>
      )}

      {/* Financial / quantitative outputs */}
      {hasFinancials && (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {outputs.map((o) => (
              <div key={o.key} className="rounded-xl border border-border bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {o.label}
                </p>
                <p className="mt-1 font-serif text-2xl text-ink">
                  {formatOutput(o.value, o.format)}
                </p>
                {o.period ? <p className="text-xs text-muted-foreground">{o.period}</p> : null}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Figures are estimates based on the information you provided, not a guarantee.
          </p>
        </div>
      )}

      {/* CTA */}
      {cta?.url && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
          <h2 className="font-serif text-2xl text-ink">Ready to move forward?</h2>
          <a
            href={cta.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onCta}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Calendar className="h-4 w-4" />
            {cta.label ?? "Book a Strategy Call"}
          </a>
        </div>
      )}

      {/* Cross-funnel recommendations */}
      {recommendations.length > 0 && (
        <div>
          <p className="eyebrow mb-3 text-muted-foreground">Recommended for you</p>
          <div className="space-y-3">
            {recommendations.slice(0, 2).map((r, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-medium text-ink">{r.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>
                </div>
                {r.cta?.type === "funnel" && r.cta.slug ? (
                  <button
                    type="button"
                    onClick={() => onRecommendation?.(r.cta.slug!, r.title)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-primary-foreground"
                  >
                    {r.cta.label ?? "Take Assessment"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : r.cta?.url ? (
                  <a
                    href={r.cta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-primary-foreground"
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
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base text-ink">{value}</p>
    </div>
  );
}
