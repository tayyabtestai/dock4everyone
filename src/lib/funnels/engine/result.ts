/**
 * Personalised result assembly. Combines the scoring, calculation and
 * recommendation engines into the single `FunnelResult` the public funnel
 * renders after the contact gate. Everything reflects the respondent's own
 * answers — no generic output.
 */
import { runCalculations } from "./calc";
import { selectRecommendations } from "./recommendations";
import { scoreFunnel } from "./scoring";
import type {
  Answers,
  EngineQuestion,
  FunnelResult,
  FunnelSnapshot,
  JsonValue,
  ResultConfig,
} from "./types";

/** Human-readable label(s) for the answer to a given question. */
function answerLabel(q: EngineQuestion | undefined, answer: JsonValue | undefined): string | null {
  if (!q || answer == null || answer === "") return null;
  const values = Array.isArray(answer) ? answer.map(String) : [String(answer)];
  const labels = values.map((v) => q.options.find((o) => o.value === v)?.label ?? v);
  return labels.length ? labels.join(", ") : null;
}

function resolveOpportunity(
  spec: { from?: string; label?: string; text?: string } | undefined,
  questionByKey: Map<string, EngineQuestion>,
  answers: Answers,
): string | null {
  if (!spec) return null;
  if (spec.text) return spec.text;
  if (spec.from) {
    const label = answerLabel(questionByKey.get(spec.from), answers[spec.from]);
    if (label) return spec.label ? `${spec.label}: ${label}` : label;
  }
  return spec.label ?? null;
}

function resolveService(cfg: ResultConfig | undefined, normalized: number): string | null {
  const rs = cfg?.recommendedService;
  if (!rs) return null;
  if (rs.map && rs.map.length) {
    const hit = rs.map.find((m) => normalized >= m.min && normalized <= m.max);
    if (hit) return hit.text;
  }
  return rs.text ?? null;
}

/** Compute the complete result for a submission. Server-authoritative. */
export function buildResult(
  snapshot: FunnelSnapshot,
  answers: Answers,
  industry: string | null,
): FunnelResult {
  const score = scoreFunnel(snapshot, answers, industry);
  const outputs = runCalculations(snapshot, answers, score);
  const recommendations = selectRecommendations(snapshot, { answers, score, outputs, industry });

  const questionByKey = new Map(snapshot.questions.map((q) => [q.key, q]));
  const resultCfg = snapshot.settings?.result;

  const primary = resolveOpportunity(resultCfg?.primary, questionByKey, answers);
  const secondary = resolveOpportunity(resultCfg?.secondary, questionByKey, answers);
  const recommendedService = resolveService(resultCfg, score.normalized);

  const cta = snapshot.settings?.cta ?? {};

  return {
    score,
    scoreLabel: resultCfg?.scoreLabel ?? "Opportunity Score",
    outputs,
    primary,
    secondary,
    recommendedService,
    recommendations,
    cta,
    industry,
  };
}
