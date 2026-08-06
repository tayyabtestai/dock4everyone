import type { ReportPayload } from "@/lib/revenue-recovery/engine/types";
import type { ReportLayout } from "@/lib/revenue-recovery/experience";
import { Guide } from "./guide";

type Props = {
  report: ReportPayload;
  layout: ReportLayout;
  businessName?: string;
};

export function ReportView({ report, layout, businessName }: Props) {
  const impact = report.financialImpact ?? {};
  const monthly = layout.monthlyKey ? impact[layout.monthlyKey] : undefined;
  const annual = layout.annualKey ? impact[layout.annualKey] : undefined;
  const otherImpact = Object.entries(impact).filter(([k]) => k !== layout.monthlyKey && k !== layout.annualKey);
  const leaks = Object.entries(report.breakdown ?? {})
    .filter(([, v]) => Number.isFinite(v) && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const systems = layout.systemsTag
    ? report.recommendations.filter((r) => (r as any).tag === layout.systemsTag)
    : [];
  const primaryRecs = systems.length
    ? report.recommendations.filter((r) => !systems.includes(r))
    : report.recommendations;
  const generated = report.generatedAt ? new Date(report.generatedAt) : new Date();

  return (
    <div className="mx-auto max-w-3xl space-y-12" id="rr-report">
      {/* Hero */}
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {businessName && <span>{businessName}</span>}
          {report.industry && <span>· {report.industry}</span>}
          <span>· {generated.toLocaleDateString()}</span>
        </div>
        <h1 className="mt-4 font-serif text-4xl leading-tight text-ink md:text-5xl">{report.hero.title}</h1>
        {report.hero.body && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{report.hero.body}</p>}
      </header>

      {/* Headline numbers */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label={layout.monthlyLabel ?? "Estimated monthly impact"} value={money(monthly)} large />
        <Stat label={layout.annualLabel ?? "Estimated annual impact"} value={money(annual)} large />
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{layout.scoreLabel}</p>
          <p className="mt-2 font-serif text-4xl text-ink">
            {Number.isFinite(report.score.value) ? Math.round(report.score.value) : "—"}
            <span className="ml-1 text-base text-muted-foreground">/ {report.score.scale.max}</span>
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Severity · {report.score.band?.label ?? "Not determined"}
          </p>
        </div>
      </section>

      {report.score.band?.copy && (
        <section className="rounded-lg border border-border bg-white p-8">
          <Guide pose="concern" size="sm" message={report.score.band.copy} />
        </section>
      )}

      {/* Top revenue leaks */}
      {leaks.length > 0 && (
        <Section title="Top revenue leaks">
          <ol className="space-y-2">
            {leaks.map(([k, v], i) => (
              <li key={k} className="flex items-baseline justify-between gap-6 rounded-lg border border-border bg-white p-5">
                <span className="text-sm text-ink">
                  <span className="mr-3 font-serif text-lg text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  {report.labels?.[k] ?? humanise(k)}
                </span>
                <span className="shrink-0 font-serif text-lg text-ink">{round(v)}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Financial breakdown */}
      {otherImpact.length > 0 && (
        <Section title="Financial breakdown">
          <div className="grid gap-3 sm:grid-cols-2">
            {otherImpact.map(([k, v]) => (
              <Stat key={k} label={humanise(k)} value={money(v)} />
            ))}
          </div>
        </Section>
      )}

      {/* Operational breakdown */}
      {Object.keys(report.breakdown ?? {}).length > 0 && (
        <Section title="Operational breakdown">
          <div className="space-y-2">
            {Object.entries(report.breakdown).map(([k, v]) => {
              const max = Math.max(...Object.values(report.breakdown).map((n) => Math.abs(n) || 0), 1);
              const pct = Math.min(100, (Math.abs(v) / max) * 100);
              return (
                <div key={k}>
                  <div className="flex items-baseline justify-between gap-4 text-xs text-muted-foreground">
                    <span>{report.labels?.[k] ?? humanise(k)}</span>
                    <span className="text-ink">{round(v)}</span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full bg-ink/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Industry comparison */}
      {layout.benchmarks.length > 0 && (
        <Section title="Industry comparison">
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <th className="px-5 py-3 text-left font-semibold">Measure</th>
                  <th className="px-5 py-3 text-right font-semibold">You</th>
                  <th className="px-5 py-3 text-right font-semibold">Industry</th>
                </tr>
              </thead>
              <tbody>
                {layout.benchmarks.map((b) => (
                  <tr key={b.label} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3 text-ink">{b.label}</td>
                    <td className="px-5 py-3 text-right text-ink">{b.you ?? "—"}{b.unit ?? ""}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{b.industry ?? "—"}{b.unit ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Opportunities / recommendations */}
      {primaryRecs.length > 0 && (
        <Section title="Top opportunities">
          <ul className="space-y-3">
            {primaryRecs.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-white p-5">
                <h3 className="font-serif text-xl italic text-ink">{r.title}</h3>
                {r.body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {systems.length > 0 && (
        <Section title="Recommended systems">
          <ul className="space-y-3">
            {systems.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-white p-5">
                <h3 className="font-serif text-xl italic text-ink">{r.title}</h3>
                {r.body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {layout.outcomes.length > 0 && (
        <Section title="Expected business outcomes">
          <ul className="grid gap-2 sm:grid-cols-2">
            {layout.outcomes.map((o) => (
              <li key={o} className="rounded-lg border border-border bg-white p-5 text-sm leading-relaxed text-ink">{o}</li>
            ))}
          </ul>
        </Section>
      )}

      {layout.roadmap.length > 0 && (
        <Section title="90-day improvement roadmap">
          <ol className="space-y-3">
            {layout.roadmap.map((r) => (
              <li key={r.phase + r.title} className="rounded-lg border border-border bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{r.phase}</p>
                <h3 className="mt-2 font-serif text-xl italic text-ink">{r.title}</h3>
                {r.body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {layout.nextActions.length > 0 && (
        <Section title="Next best actions">
          <ul className="space-y-2">
            {layout.nextActions.map((a) => (
              <li key={a} className="border-l-2 border-border pl-4 text-sm leading-relaxed text-ink">{a}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* CTA */}
      <section className="rounded-lg border border-border bg-ink p-8 text-primary-foreground print:hidden">
        <h2 className="font-serif text-3xl italic">{report.nextSteps.title}</h2>
        {report.nextSteps.body && <p className="mt-3 text-sm leading-relaxed opacity-90">{report.nextSteps.body}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {report.nextSteps.cta?.href && (
            <a
              href={report.nextSteps.cta.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-md bg-white px-6 py-3 text-sm font-medium text-ink hover:opacity-90"
            >
              {report.nextSteps.cta.label ?? layout.ctaPrimary}
            </a>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex rounded-md border border-white/40 px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-80"
          >
            {layout.ctaSecondary ?? "Download PDF"}
          </button>
        </div>
      </section>

      {(layout.pdf.brandName || layout.pdf.footnote) && (
        <footer className="hidden border-t border-border pt-4 text-[11px] text-muted-foreground print:block">
          {layout.pdf.brandName && <p className="font-semibold uppercase tracking-[0.16em]">{layout.pdf.brandName}</p>}
          {layout.pdf.footnote && <p className="mt-1">{layout.pdf.footnote}</p>}
        </footer>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={`mt-2 font-serif text-ink ${large ? "text-4xl" : "text-3xl"}`}>{value}</p>
    </div>
  );
}

function money(n?: number) {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function round(n: number) {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : "—";
}

function humanise(k: string) {
  return k.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}