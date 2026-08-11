/**
 * Calculation engine. Runs the funnel's configured financial/quantitative
 * outputs (e.g. ROI, voice-agent opportunity) deterministically from the user's
 * actual inputs. Outputs are computed in order so later formulas can reference
 * earlier ones. The automation percentage is derived from the score, never
 * invented.
 */
import { evalExpr } from "./expr";
import type { Answers, ComputedOutput, FunnelSnapshot, JsonValue, ScoreResult } from "./types";

/** Constants available to every formula. */
const CONSTANTS: Record<string, number> = {
  WEEKS_PER_MONTH: 4.33,
  WEEKS_PER_YEAR: 52,
  MONTHS_PER_YEAR: 12,
  DAYS_PER_WEEK: 5,
  HOURS_PER_DAY: 8,
};

function toNum(v: JsonValue | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Compute the configured outputs.
 *
 * Scope exposed to formulas:
 *  - every answer key coerced to a number (blanks → 0)
 *  - `score` (normalised 0–100) and `automation_pct` (score / 100)
 *  - the named constants above
 *  - each prior output key (outputs compute top-to-bottom)
 */
export function runCalculations(
  snapshot: FunnelSnapshot,
  answers: Answers,
  score: ScoreResult,
): ComputedOutput[] {
  const outputs = snapshot.settings?.calc?.outputs ?? [];
  if (!outputs.length) return [];

  const scope: Record<string, number> = { ...CONSTANTS };
  for (const [k, v] of Object.entries(answers)) scope[k] = toNum(v);
  scope["score"] = score.normalized;
  scope["automation_pct"] = score.normalized / 100;

  const results: ComputedOutput[] = [];
  for (const out of outputs) {
    const value = evalExpr(out.formula, scope);
    scope[out.key] = value;
    if (!out.hidden) {
      results.push({
        key: out.key,
        label: out.label,
        value,
        format: out.format ?? "number",
        period: out.period,
      });
    }
  }
  return results;
}

/** Format a computed value for display. */
export function formatOutput(value: number, format: ComputedOutput["format"]): string {
  const round = (n: number, d = 0) => {
    const f = Math.pow(10, d);
    return Math.round(n * f) / f;
  };
  switch (format) {
    case "currency":
      return `$${round(value).toLocaleString("en-US")}`;
    case "percent":
      return `${round(value, 1)}%`;
    case "hours":
      return `${round(value).toLocaleString("en-US")} hrs`;
    default:
      return round(value).toLocaleString("en-US");
  }
}
