import { useEffect, useState } from "react";

const LINES = ["Reviewing your responses…", "Modelling your business…", "Calculating recoverable revenue…", "Preparing your report…"];

export function AnalysisScreen({ onDone, durationMs = 2400 }: { onDone: () => void; durationMs?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const step = durationMs / LINES.length;
    const iv = setInterval(() => setI((v) => Math.min(v + 1, LINES.length - 1)), step);
    const done = setTimeout(onDone, durationMs);
    return () => { clearInterval(iv); clearTimeout(done); };
  }, [durationMs, onDone]);
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full w-1/3 animate-pulse bg-ink" />
      </div>
      <p className="mt-8 font-serif text-2xl italic text-ink">{LINES[i]}</p>
    </div>
  );
}