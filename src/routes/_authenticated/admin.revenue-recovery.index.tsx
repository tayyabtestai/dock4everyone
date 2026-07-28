import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles, Zap, Target } from "lucide-react";
import { CALCULATORS } from "@/lib/revenue-recovery/catalog";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/")({
  head: () => ({ meta: [{ title: "Revenue Recovery Platform — Dock" }] }),
  component: Overview,
});

function Overview() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <p className="eyebrow mb-4">Revenue Recovery Platform</p>
      <h1 className="font-serif text-5xl leading-[1.05] text-ink md:text-6xl">
        Discover exactly where <em className="italic">revenue leaks</em> out of your business.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        A business intelligence platform for service companies. Identify hidden revenue leaks, understand
        their financial impact, and see which intelligent systems can permanently stop them.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: Target, k: "Diagnose", v: "Find every leak in your operation" },
          { icon: Sparkles, k: "Quantify", v: "Translate leaks into recoverable dollars" },
          { icon: Zap, k: "Recover", v: "Deploy systems that permanently fix them" },
        ].map(({ icon: Icon, k, v }) => (
          <div key={k} className="rounded-lg border border-border bg-white p-6">
            <Icon className="h-5 w-5 text-ink" />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
            <p className="mt-2 text-base text-ink">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex items-baseline justify-between">
        <h2 className="font-serif text-3xl italic text-ink">Revenue Recovery Engine</h2>
        <Link to="/admin/revenue-recovery/engine" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:opacity-70">
          Open engine <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        The flagship product. A guided business conversation that reveals hidden revenue opportunities and
        the specific systems that recover them.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.tagline}</p>
            </div>
            <div className="mt-6 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70 group-hover:text-ink">
              Open <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
