import type { Answers, CalculatorConfig, Question, ScoringBand } from "./types";
import { evalFormula } from "./evaluator";
import { visibleQuestions } from "./branching";

function answerScore(q: Question, value: unknown): number {
  if (value == null) return 0;
  if (q.type === "single_choice" || q.type === "yes_no") {
    const opt = (q.options ?? []).find((o) => o.value === String(value));
    return opt?.score ?? 0;
  }
  if (q.type === "multi_choice" && Array.isArray(value)) {
    return (q.options ?? [])
      .filter((o) => (value as string[]).includes(o.value))
      .reduce((s, o) => s + (o.score ?? 0), 0);
  }
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function computeScore(
  config: CalculatorConfig,
  answers: Answers,
  industry?: string | null,
): { score: number; breakdown: Record<string, number>; band?: ScoringBand } {
  const rules = config.scoring;
  const visible = visibleQuestions(config.questions, answers, industry);
  const breakdown: Record<string, number> = {};
  let raw = 0;

  if (rules.method === "custom" && rules.custom) {
    raw = evalFormula(rules.custom, { answers: answers as Record<string, unknown>, industry });
  } else {
    for (const q of visible) {
      const weight = q.weight ?? 0;
      const s = answerScore(q, answers[q.key]) * (weight || 1);
      breakdown[q.key] = s;
      raw += s;
    }
  }

  const mul = (rules.industryMultipliers && industry) ? (rules.industryMultipliers[industry] ?? 1) : 1;
  let score = raw * mul;
  if (rules.scale) score = Math.max(rules.scale.min, Math.min(rules.scale.max, score));
  const band = (rules.bands ?? []).find((b) => score >= b.min && score <= b.max);
  return { score, breakdown, band };
}

export function computeFinancialImpact(
  config: CalculatorConfig,
  answers: Answers,
  score: number,
  industry?: string | null,
): Record<string, number> {
  const out: Record<string, number> = {};
  const formulas = config.scoring.financialImpact ?? {};
  const ctx = { answers: answers as Record<string, unknown>, score, industry };
  for (const [k, f] of Object.entries(formulas)) out[k] = evalFormula(f, ctx);
  return out;
}