/**
 * Recommendation engine. Selects the cross-funnel / service recommendations
 * whose trigger conditions match the respondent's answers, score, computed
 * outputs and industry. Every recommendation carries a reason — nothing is
 * random.
 */
import { evalConditions } from "./conditions";
import type {
  Answers,
  ComputedOutput,
  FunnelSnapshot,
  JsonValue,
  ScoreResult,
  SelectedRecommendation,
} from "./types";

export type Signals = {
  answers: Answers;
  score: ScoreResult;
  outputs: ComputedOutput[];
  industry: string | null;
};

/**
 * Build the value lookup a trigger condition reads from. Trigger `when` may be:
 *  - "score"            → normalised score
 *  - "industry"         → chosen industry
 *  - "output:<key>"     → a computed output value
 *  - any other string   → an answer key
 */
function makeReader(signals: Signals): (key: string) => JsonValue | undefined {
  const outByKey = new Map(signals.outputs.map((o) => [o.key, o.value]));
  return (key: string) => {
    if (key === "score") return signals.score.normalized;
    if (key === "industry") return signals.industry;
    if (key.startsWith("output:")) return outByKey.get(key.slice(7)) ?? null;
    return signals.answers[key];
  };
}

/**
 * Return matching recommendations, ordered by order_index. Industry-specific
 * recommendations only apply when their industry matches (or is blank).
 */
export function selectRecommendations(
  snapshot: FunnelSnapshot,
  signals: Signals,
): SelectedRecommendation[] {
  const read = makeReader(signals);
  const recs = [...(snapshot.recommendations ?? [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  );

  const out: SelectedRecommendation[] = [];
  for (const r of recs) {
    const target = (r.industry ?? "").trim();
    if (target && target !== "All Industries" && signals.industry && target !== signals.industry) {
      continue;
    }
    if (!evalConditions(r.triggers, read)) continue;
    out.push({
      title: r.title,
      body: r.body,
      reason: (r.reason && r.reason.trim()) || r.body,
      cta: r.cta ?? {},
    });
  }
  return out;
}
