import type { ReportPayload } from "@/lib/revenue-recovery/engine/types";

export function ReportView({ report }: { report: ReportPayload }) {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        {report.hero.eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{report.hero.eyebrow}</p>}
        <h1 className="mt-3 font-serif text-4xl leading-tight text-ink md:text-5xl">{report.hero.title}</h1>
        {report.hero.body && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{report.hero.body}</p>}
      </header>

      <section className="rounded-lg border border-border bg-white p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Score</p>
        <p className="mt-2 font-serif text-6xl text-ink">{Math.round(report.score.value)}</p>
        <p className="mt-1 text-xs text-muted-foreground">out of {report.score.scale.max}</p>
        {report.score.band && (
          <p className="mt-4 font-serif text-xl italic text-ink">{report.score.band.label}</p>
        )}
      </section>

      {Object.keys(report.financialImpact).length > 0 && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Financial impact</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(report.financialImpact).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-white p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.replace(/_/g, " ")}</p>
                <p className="mt-2 font-serif text-3xl text-ink">{formatCurrency(v)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {report.recommendations.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recommendations</p>
          <ul className="mt-4 space-y-3">
            {report.recommendations.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-white p-5">
                <h3 className="font-serif text-xl italic text-ink">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.nextSteps.cta?.href && (
        <section className="rounded-lg border border-border bg-ink p-8 text-primary-foreground">
          <h2 className="font-serif text-3xl italic">{report.nextSteps.title}</h2>
          {report.nextSteps.body && <p className="mt-3 text-sm leading-relaxed opacity-90">{report.nextSteps.body}</p>}
          <a
            href={report.nextSteps.cta.href}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex rounded-md bg-white px-6 py-3 text-sm font-medium text-ink hover:opacity-90"
          >
            {report.nextSteps.cta.label ?? "Book strategy call"}
          </a>
        </section>
      )}
    </div>
  );
}

function formatCurrency(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}