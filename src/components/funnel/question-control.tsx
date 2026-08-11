/**
 * Renders a single funnel question's input, for every engine question type.
 * Controlled: the parent owns the answers map. "Other" free-text is stored
 * under `${key}__other`. Shared by the public funnel and the builder preview.
 */
import type { EngineQuestion, JsonValue } from "@/lib/funnels/engine";

type Props = {
  question: EngineQuestion;
  value: JsonValue | undefined;
  otherText: string;
  onChange: (value: JsonValue) => void;
  onOther: (text: string) => void;
};

const cardBase =
  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";
const cardOff = "border-border bg-white hover:border-ink/30";
const cardOn = "border-accent bg-accent/5 ring-1 ring-accent/30";

export function QuestionControl({ question: q, value, otherText, onChange, onOther }: Props) {
  const showOther = () => {
    if (q.type === "multi_choice") {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return arr.some((v) => q.options.find((o) => o.value === v)?.isOther);
    }
    return typeof value === "string" && q.options.find((o) => o.value === value)?.isOther;
  };

  const otherField = showOther() ? (
    <input
      autoFocus
      value={otherText}
      onChange={(e) => onOther(e.target.value)}
      placeholder="Tell us what you need…"
      className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
      aria-label="Tell us what you need"
    />
  ) : null;

  // Choice (single) — cards or dropdown
  if (q.type === "single_choice") {
    if (q.display === "dropdown") {
      return (
        <div>
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
          >
            <option value="">Select…</option>
            {q.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {otherField}
        </div>
      );
    }
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o) => {
          const on = value === o.value;
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`${cardBase} ${on ? cardOn : cardOff}`}
              aria-pressed={on}
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? "border-accent" : "border-muted-foreground/40"}`}
              >
                {on ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
              </span>
              {o.label}
            </button>
          );
        })}
        <div className="sm:col-span-2">{otherField}</div>
      </div>
    );
  }

  // Multi choice
  if (q.type === "multi_choice") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (v: string) =>
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o) => {
          const on = arr.includes(o.value);
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => toggle(o.value)}
              className={`${cardBase} ${on ? cardOn : cardOff}`}
              aria-pressed={on}
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-accent bg-accent text-white" : "border-muted-foreground/40"}`}
              >
                {on ? "✓" : null}
              </span>
              {o.label}
            </button>
          );
        })}
        <div className="sm:col-span-2">{otherField}</div>
      </div>
    );
  }

  // Yes / No
  if (q.type === "yes_no") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((o) => {
          const on = value === o.value;
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`${cardBase} justify-center ${on ? cardOn : cardOff}`}
              aria-pressed={on}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Rating (1–5)
  if (q.type === "rating") {
    const cur = typeof value === "number" ? value : 0;
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => onChange(n)}
            className={`h-11 w-11 rounded-xl border text-sm font-medium transition ${n <= cur ? cardOn : cardOff}`}
            aria-label={`${n} of 5`}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  // Slider
  if (q.type === "slider") {
    const min = q.validation?.min ?? 0;
    const max = q.validation?.max ?? 100;
    const cur = typeof value === "number" ? value : min;
    return (
      <div>
        <input
          type="range"
          min={min}
          max={max}
          step={q.validation?.step ?? 1}
          value={cur}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="mt-1 text-sm text-muted-foreground">
          {cur}
          {q.validation?.unit ? ` ${q.validation.unit}` : ""}
        </div>
      </div>
    );
  }

  // Number / currency / percentage
  if (q.type === "number" || q.type === "currency" || q.type === "percentage") {
    const unit =
      q.validation?.unit ?? (q.type === "currency" ? "$" : q.type === "percentage" ? "%" : "");
    return (
      <div className="relative">
        {q.type === "currency" ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
        ) : null}
        <input
          type="number"
          inputMode="decimal"
          min={q.validation?.min}
          max={q.validation?.max}
          step={q.validation?.step}
          value={typeof value === "number" ? value : typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className={`w-full rounded-lg border border-border bg-white py-2.5 text-sm outline-none focus:border-ink/40 ${q.type === "currency" ? "pl-7 pr-3" : "px-3"}`}
        />
        {unit && q.type !== "currency" ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </div>
    );
  }

  // Long text
  if (q.type === "long_text") {
    return (
      <textarea
        rows={4}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        maxLength={q.validation?.maxLength ?? 2000}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
      />
    );
  }

  // Short text (default)
  return (
    <input
      type="text"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      maxLength={q.validation?.maxLength ?? 300}
      className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
    />
  );
}
