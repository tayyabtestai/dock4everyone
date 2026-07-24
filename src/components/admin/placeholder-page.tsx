export function PlaceholderPage({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h1 className="font-serif text-5xl leading-tight text-ink">{title}</h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-10 inline-flex items-center rounded-full border border-border bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Coming Soon
      </div>
    </div>
  );
}