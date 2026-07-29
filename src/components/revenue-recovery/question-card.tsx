import type { Answer, Question } from "@/lib/revenue-recovery/engine/types";
import { useId } from "react";

type Props = {
  question: Question;
  value: Answer;
  onChange: (v: Answer) => void;
  error?: string;
};

export function QuestionCard({ question, value, onChange, error }: Props) {
  const id = useId();
  const q = question;
  return (
    <div className="rounded-lg border border-border bg-white p-6">
      {q.section && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{q.section}</p>
      )}
      <label htmlFor={id} className="mt-2 block font-serif text-2xl leading-snug text-ink">
        {q.label}
        {q.required && <span className="ml-1 text-muted-foreground">*</span>}
      </label>
      {q.help && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{q.help}</p>}
      <div className="mt-6">
        <QuestionInput id={id} question={q} value={value} onChange={onChange} />
      </div>
      {q.insight && (
        <p className="mt-4 border-l-2 border-border pl-3 text-xs italic text-muted-foreground">{q.insight}</p>
      )}
      {error && <p className="mt-3 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function QuestionInput({ id, question, value, onChange }: Props & { id: string }) {
  const q = question;
  const base = "w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-ink";

  switch (q.type) {
    case "single_choice":
    case "yes_no": {
      const opts = q.type === "yes_no" && !q.options?.length
        ? [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]
        : q.options ?? [];
      return (
        <div className="grid gap-2">
          {opts.map((o) => {
            const active = String(value) === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(o.value)}
                className={`flex items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition ${
                  active ? "border-ink bg-secondary text-ink" : "border-border bg-white text-ink/80 hover:border-ink/40"
                }`}
              >
                <span>{o.label}</span>
                {active && <span className="text-xs uppercase tracking-widest">Selected</span>}
              </button>
            );
          })}
        </div>
      );
    }
    case "multi_choice": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="grid gap-2">
          {(q.options ?? []).map((o) => {
            const active = arr.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(active ? arr.filter((v) => v !== o.value) : [...arr, o.value])}
                className={`flex items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition ${
                  active ? "border-ink bg-secondary text-ink" : "border-border bg-white text-ink/80 hover:border-ink/40"
                }`}
              >
                <span>{o.label}</span>
                {active && <span className="text-xs uppercase tracking-widest">✓</span>}
              </button>
            );
          })}
        </div>
      );
    }
    case "number":
    case "currency":
    case "percentage":
    case "rating":
      return (
        <input
          id={id}
          type="number"
          className={base}
          value={value == null ? "" : Number(value)}
          min={q.validation?.min}
          max={q.validation?.max}
          step={q.validation?.step ?? (q.type === "percentage" ? 1 : "any")}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "slider":
      return (
        <div>
          <input
            id={id}
            type="range"
            className="w-full accent-ink"
            min={q.validation?.min ?? 0}
            max={q.validation?.max ?? 100}
            step={q.validation?.step ?? 1}
            value={Number(value ?? q.validation?.min ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <p className="mt-2 text-sm text-ink">{value ?? q.validation?.min ?? 0}</p>
        </div>
      );
    case "short_text":
      return <input id={id} type="text" className={base} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
    case "long_text":
      return <textarea id={id} className={`${base} min-h-[120px]`} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
    default:
      return null;
  }
}