/**
 * Renders a single funnel question's input for the immersive (dark) customer
 * experience — every engine question type, large touch targets, clear selected
 * state. Controlled: the parent owns the answers map. "Other" free-text is
 * stored under `${key}__other`. Icons are inferred from the option label so the
 * data model stays schema-light.
 */
import type { EngineOption, EngineQuestion, JsonValue } from "@/lib/funnels/engine";
import {
  Check,
  Headset,
  Users,
  CalendarClock,
  Database,
  RefreshCw,
  Mail,
  PieChart,
  Settings2,
  Phone,
  ShoppingCart,
  Undo2,
  Megaphone,
  Boxes,
  Sparkles,
  Bot,
  Mic,
  Wrench,
  Building2,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

type Props = {
  question: EngineQuestion;
  value: JsonValue | undefined;
  otherText: string;
  onChange: (value: JsonValue) => void;
  onOther: (text: string) => void;
};

/** Infer a line icon from an option's label/value keywords. */
function optionIcon(o: EngineOption): LucideIcon {
  const t = `${o.value} ${o.label}`.toLowerCase();
  if (o.isOther) return MoreHorizontal;
  if (/support|help desk|ticket/.test(t)) return Headset;
  if (/call|phone|dispatch|inbound|outbound|voice/.test(t)) return Phone;
  if (/appointment|booking|schedul|calendar/.test(t)) return CalendarClock;
  if (/data entry|data\b/.test(t)) return Database;
  if (/crm|update/.test(t)) return RefreshCw;
  if (/follow|email|nurture/.test(t)) return Mail;
  if (/report|analytic|insight/.test(t)) return PieChart;
  if (/workflow|internal|process|operations/.test(t)) return Settings2;
  if (/order|checkout|purchase/.test(t)) return ShoppingCart;
  if (/return|refund/.test(t)) return Undo2;
  if (/market|lead recovery|recover/.test(t)) return Megaphone;
  if (/invent|product|stock/.test(t)) return Boxes;
  if (/lead|qualif|prospect/.test(t)) return Users;
  if (/chatbot|rag|knowledge/.test(t)) return Bot;
  if (/voice/.test(t)) return Mic;
  if (/estimate|technician|hvac|repair/.test(t)) return Wrench;
  if (/company|business|property|real estate/.test(t)) return Building2;
  return Sparkles;
}

const rowBase =
  "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 min-h-[52px]";
const rowOff = "border-white/10 bg-white/[0.03] text-white/85 hover:bg-white/[0.06]";
const rowOn = "border-indigo-400/60 bg-indigo-500/15 text-white ring-1 ring-indigo-400/40";

const boxBase = "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors";
const boxOff = "border-white/25";
const boxOn = "border-transparent bg-gradient-to-br from-indigo-500 to-violet-500 text-white";

const inputCls =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder-white/35 outline-none transition-colors focus:border-indigo-400/60";

export function QuestionControl({ question: q, value, otherText, onChange, onOther }: Props) {
  const otherActive = () => {
    if (q.type === "multi_choice") {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return arr.some((v) => q.options.find((o) => o.value === v)?.isOther);
    }
    return typeof value === "string" && q.options.find((o) => o.value === value)?.isOther;
  };

  const otherField = otherActive() ? (
    <input
      autoFocus
      value={otherText}
      onChange={(e) => onOther(e.target.value)}
      placeholder="Tell us what you need…"
      className={`${inputCls} mt-1`}
      aria-label="Tell us what you need"
    />
  ) : null;

  // Single choice — dropdown or cards
  if (q.type === "single_choice") {
    if (q.display === "dropdown") {
      return (
        <div className="space-y-2">
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputCls} appearance-none`}
          >
            <option value="" className="bg-[#0d0f16]">
              Select…
            </option>
            {q.options.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0d0f16]">
                {o.label}
              </option>
            ))}
          </select>
          {otherField}
        </div>
      );
    }
    return (
      <div className="space-y-2.5">
        {q.options.map((o) => {
          const on = value === o.value;
          const Icon = optionIcon(o);
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`${rowBase} ${on ? rowOn : rowOff}`}
              aria-pressed={on}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${on ? "border-transparent bg-gradient-to-br from-indigo-500 to-violet-500" : "border-white/25"}`}
              >
                {on ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
              </span>
              <Icon className="h-[18px] w-[18px] shrink-0 text-white/55" />
              <span className="flex-1">{o.label}</span>
            </button>
          );
        })}
        {otherField}
      </div>
    );
  }

  // Multi choice
  if (q.type === "multi_choice") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (v: string) =>
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    return (
      <div className="space-y-2.5">
        {q.options.map((o) => {
          const on = arr.includes(o.value);
          const Icon = optionIcon(o);
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => toggle(o.value)}
              className={`${rowBase} ${on ? rowOn : rowOff}`}
              aria-pressed={on}
            >
              <span className={`${boxBase} ${on ? boxOn : boxOff}`}>
                {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
              </span>
              <Icon className="h-[18px] w-[18px] shrink-0 text-white/55" />
              <span className="flex-1">{o.label}</span>
            </button>
          );
        })}
        {otherField}
      </div>
    );
  }

  // Yes / No
  if (q.type === "yes_no") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {q.options.map((o) => {
          const on = value === o.value;
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`${rowBase} justify-center ${on ? rowOn : rowOff}`}
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
      <div className="flex justify-center gap-2 sm:gap-2.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => onChange(n)}
            className={`h-12 w-12 rounded-2xl border text-lg font-semibold transition-colors sm:h-14 sm:w-14 ${n <= cur ? rowOn : rowOff}`}
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
      <div className="px-1">
        <input
          type="range"
          min={min}
          max={max}
          step={q.validation?.step ?? 1}
          value={cur}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="mt-2 text-center text-sm text-white/60">
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
      <div className="relative mx-auto max-w-sm">
        {q.type === "currency" ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
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
          placeholder="0"
          className={`${inputCls} text-center text-lg ${q.type === "currency" ? "pl-8" : ""}`}
        />
        {unit && q.type !== "currency" ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/45">
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
        placeholder="Type your answer…"
        className={inputCls}
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
      placeholder="Type your answer…"
      className={inputCls}
    />
  );
}
