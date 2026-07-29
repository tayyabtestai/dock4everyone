export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Milestone ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? "w-6 bg-ink" : i < current ? "w-2 bg-ink/60" : "w-2 bg-ink/15"
          }`}
        />
      ))}
    </div>
  );
}