import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

export type ResourceCardData = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  button_text: string;
};

export function ResourceCard({ r }: { r: ResourceCardData }) {
  return (
    <Link
      to="/resource/$slug"
      params={{ slug: r.slug }}
      className="group block"
    >
      <div className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-secondary outline outline-1 -outline-offset-1 outline-border">
        {r.thumbnail_url ? (
          <img
            src={r.thumbnail_url}
            alt={r.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <span className="eyebrow opacity-60">{r.category}</span>
          </div>
        )}
      </div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">{r.category}</span>
        <span className="rounded-full bg-accent/5 px-2 py-0.5 text-[10px] font-medium text-accent ring-1 ring-accent/10">
          Free
        </span>
      </div>
      <h3 className="mb-2 text-xl font-medium text-ink transition-colors group-hover:text-accent">
        {r.title}
      </h3>
      {r.description && (
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
      )}
      <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2 text-sm font-medium ring-1 ring-border transition-colors group-hover:bg-secondary">
        {r.button_text}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
