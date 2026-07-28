import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { CALCULATORS } from "@/lib/revenue-recovery/catalog";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/engine")({
  head: () => ({ meta: [{ title: "Revenue Recovery Engine — Dock" }] }),
  component: Engine,
});

function Engine() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <p className="eyebrow mb-4">Revenue Recovery Engine</p>
      <h1 className="font-serif text-5xl leading-[1.05] text-ink">
        The flagship engine for uncovering <em className="italic">hidden revenue</em>.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        A collection of independent, industry-adaptable calculators. Each one is a standalone lead
        generation product with its own landing page, public URL, questions, scoring, report and CRM records.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CALCULATORS.map((c) => (
          <Link
            key={c.slug}
            to={`/admin/revenue-recovery/${c.slug}` as never}
            className="group flex flex-col justify-between rounded-lg border border-border bg-white p-6 transition-colors hover:border-ink/40"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {c.outcome}
              </p>
              <h3 className="mt-3 font-serif text-xl italic leading-snug text-ink">{c.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
            </div>
            <div className="mt-6 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70 group-hover:text-ink">
              Configure <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
