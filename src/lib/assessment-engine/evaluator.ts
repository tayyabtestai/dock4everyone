import type { AnswerMap, ComputedMap, Formula, FormulaArg, FormulaStep, RecommendationRule } from "./types";

function toNum(v: unknown): number {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") { const n = parseFloat(v.replace(/[,$%\s]/g, "")); return isFinite(n) ? n : 0; }
  if (typeof v === "boolean") return v ? 1 : 0;
  return 0;
}

function resolveArg(arg: FormulaArg, answers: AnswerMap, computed: ComputedMap, prev: number): number {
  if (arg.kind === "const") return toNum(arg.value);
  if (arg.kind === "prev") return prev;
  if (arg.ref in computed) return computed[arg.ref];
  return toNum(answers[arg.ref]);
}

function runStep(step: FormulaStep, answers: AnswerMap, computed: ComputedMap, prev: number): number {
  const vals = step.args.map((a) => resolveArg(a, answers, computed, prev));
  switch (step.op) {
    case "add": return vals.reduce((a, b) => a + b, 0);
    case "sub": return vals.slice(1).reduce((a, b) => a - b, vals[0] ?? 0);
    case "mul": return vals.reduce((a, b) => a * b, 1);
    case "div": return vals.slice(1).reduce((a, b) => (b === 0 ? 0 : a / b), vals[0] ?? 0);
    case "pct": return (vals[0] ?? 0) * ((vals[1] ?? 0) / 100);
    case "round": return Math.round(vals[0] ?? 0);
    case "min": return Math.min(...vals);
    case "max": return Math.max(...vals);
    case "avg": return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    default: return 0;
  }
}

export function evaluateFormulas(formulas: Formula[], answers: AnswerMap): ComputedMap {
  const computed: ComputedMap = {};
  for (const f of formulas ?? []) {
    let prev = 0;
    for (const step of f.steps ?? []) prev = runStep(step, answers, computed, prev);
    computed[f.id] = prev;
  }
  return computed;
}

export function applyRecommendations(
  rules: RecommendationRule[],
  computed: ComputedMap,
): RecommendationRule[] {
  const rank = { high: 3, medium: 2, low: 1 };
  return (rules ?? [])
    .filter((r) => {
      const v = computed[r.when.var] ?? 0;
      const t = r.when.value;
      switch (r.when.op) {
        case ">": return v > t;
        case ">=": return v >= t;
        case "<": return v < t;
        case "<=": return v <= t;
        case "==": return v === t;
        case "!=": return v !== t;
        default: return false;
      }
    })
    .sort((a, b) => rank[b.priority] - rank[a.priority]);
}

export function formatValue(value: number, format?: "number" | "currency" | "percent"): string {
  if (!isFinite(value)) return "—";
  if (format === "currency") return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (format === "percent") return `${value.toFixed(1)}%`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function renderTokens(template: string, computed: ComputedMap, formulas: Formula[]): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const f = formulas?.find((x) => x.id === key);
    return formatValue(computed[key] ?? 0, f?.format);
  });
}