import type { Answers, CalculatorConfig, Recommendation, ScoringBand } from "./types";
import { evalCondition } from "./evaluator";

export function selectRecommendations(
  config: CalculatorConfig,
  answers: Answers,
  band: ScoringBand | undefined,
  industry?: string | null,
): Recommendation[] {
  const ctx = { answers: answers as Record<string, unknown>, industry };
  return config.recommendations
    .filter((r) => {
      const t = r.triggers ?? {};
      if (t.industry && industry && t.industry !== industry) return false;
      if (t.band && (!band || band.key !== t.band)) return false;
      if (t.when && !evalCondition(t.when, ctx)) return false;
      return true;
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);
}