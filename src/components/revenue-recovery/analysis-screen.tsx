import { useEffect, useState } from "react";
import { Guide } from "./guide";

type Props = {
  onDone: () => void;
  durationMs?: number;
  headline?: string;
  lines?: string[];
};

export function AnalysisScreen({ onDone, durationMs = 12000, headline = "Analysing Your Business…", lines }: Props) {
  const list = lines?.length ? lines : ["Preparing your report…"];
  const [i, setI] = useState(0);
  const [pct, setPct] = useState(4);

  useEffect(() => {
    const step = durationMs / list.length;
    const iv = setInterval(() => setI((v) => Math.min(v + 1, list.length - 1)), step);
    const tick = setInterval(() => {
      setPct((p) => Math.min(97, p + Math.max(1, 100 / (durationMs / 200))));
    }, 200);
    const done = setTimeout(() => { setPct(100); onDone(); }, durationMs);
    return () => { clearInterval(iv); clearInterval(tick); clearTimeout(done); };
  }, [durationMs, list.length, onDone]);

  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <Guide pose="thinking" size="lg" />
      <h2 className="mt-8 font-serif text-3xl leading-tight text-ink md:text-4xl">{headline}</h2>
      <p key={list[i]} className="mt-4 animate-in fade-in font-serif text-xl italic text-muted-foreground duration-500">{list[i]}</p>
      <div className="mt-8 h-1 w-64 max-w-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full bg-ink transition-[width] duration-200 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">This usually takes 10–15 seconds</p>
    </div>
  );
}