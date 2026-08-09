import { Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";

export function ComingSoon({
  title, description, bullets, icon: Icon,
}: {
  title: string;
  description: string;
  bullets: string[];
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-white p-10 shadow-[0_1px_2px_rgba(28,28,27,0.04),0_12px_40px_-24px_rgba(28,28,27,0.25)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Coming soon
          </span>
          <div className="mt-6 flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border bg-secondary/50">
              <Icon className="h-5 w-5 text-ink/70" />
            </span>
            <div>
              <h1 className="font-serif text-4xl leading-tight">{title}</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>

          <ul className="mt-8 grid gap-2 sm:grid-cols-2">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-canvas/60 px-4 py-3 text-sm text-ink/75">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap gap-2">
            <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
            </Link>
            <Link to="/admin/leads" search={{}} className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary">
              Go to leads
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}