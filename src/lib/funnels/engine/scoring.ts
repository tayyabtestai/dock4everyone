/**
 * Scoring engine. Turns answers into a raw point total, a 0–100 normalised
 * score, and a qualification band. Only VISIBLE questions count, so scores are
 * consistent with what the respondent actually saw. Configurable per funnel and
 * per industry via rr_scoring_rules.config.
 */
import { visibleQuestions } from "./conditions";
import {
  DEFAULT_BANDS,
  type Answers,
  type EngineQuestion,
  type FunnelSnapshot,
  type JsonValue,
  type ResultBand,
  type ScoreResult,
  type ScoringConfig,
} from "./types";

function toNum(v: JsonValue | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function selectedValues(answer: JsonValue | undefined): string[] {
  if (answer == null) return [];
  if (Array.isArray(answer)) return answer.map(String);
  return [String(answer)];
}

function bandPoints(
  value: number,
  bands: { min?: number; max?: number; points: number }[],
): number {
  for (const b of bands) {
    const okMin = b.min == null || value >= b.min;
    const okMax = b.max == null || value <= b.max;
    if (okMin && okMax) return b.points;
  }
  return 0;
}

/** Points a single question contributes for the given answer. */
export function questionPoints(q: EngineQuestion, answer: JsonValue | undefined): number {
  const s = q.scoring;
  switch (s.mode) {
    case "options": {
      const sel = selectedValues(answer);
      return q.options
        .filter((o) => sel.includes(o.value))
        .reduce((sum, o) => sum + (o.points ?? 0), 0);
    }
    case "bands":
      return answer == null || answer === "" ? 0 : bandPoints(toNum(answer), s.bands);
    case "linear": {
      if (answer == null || answer === "") return 0;
      const raw = toNum(answer) * s.perUnit;
      return s.max != null ? Math.min(raw, s.max) : raw;
    }
    case "constant":
      return answer == null || answer === "" ? 0 : s.points;
    default:
      return 0;
  }
}

/** The maximum points a question can contribute (for normalisation). */
export function maxQuestionPoints(q: EngineQuestion): number {
  const s = q.scoring;
  switch (s.mode) {
    case "options": {
      const pts = q.options.map((o) => o.points ?? 0);
      if (!pts.length) return 0;
      // multi_choice can select all positive options; single picks the best one.
      if (q.type === "multi_choice") return pts.filter((p) => p > 0).reduce((a, b) => a + b, 0);
      return Math.max(0, ...pts);
    }
    case "bands":
      return Math.max(0, ...s.bands.map((b) => b.points));
    case "linear":
      return s.max ?? 0;
    case "constant":
      return s.points;
    default:
      return 0;
  }
}

/** Pick the scoring config for an industry (falls back to the funnel default). */
export function configForIndustry(
  snapshot: FunnelSnapshot,
  industry: string | null,
): ScoringConfig {
  const rules = snapshot.scoringRules ?? [];
  const exact = industry ? rules.find((r) => r.industry === industry) : undefined;
  const fallback = rules.find(
    (r) => r.industry == null || r.industry === "" || r.industry === "All Industries",
  );
  return exact?.config ?? fallback?.config ?? {};
}

export function bandForScore(normalized: number, bands: ResultBand[]): ResultBand {
  const found = bands.find((b) => normalized >= b.min && normalized <= b.max);
  return found ?? bands[bands.length - 1] ?? DEFAULT_BANDS[DEFAULT_BANDS.length - 1]!;
}

/**
 * Score a funnel submission. Server-authoritative: pass the raw answers and the
 * engine recomputes everything — never trust a score sent from the browser.
 */
export function scoreFunnel(
  snapshot: FunnelSnapshot,
  answers: Answers,
  industry: string | null,
): ScoreResult {
  const visible = visibleQuestions(snapshot.questions, answers, industry);
  const byQuestion: Record<string, number> = {};
  let raw = 0;
  let maxFromQuestions = 0;
  for (const q of visible) {
    const pts = questionPoints(q, answers[q.key]);
    byQuestion[q.key] = pts;
    raw += pts;
    maxFromQuestions += maxQuestionPoints(q);
  }

  const config = configForIndustry(snapshot, industry);
  const max = config.maxPoints && config.maxPoints > 0 ? config.maxPoints : maxFromQuestions;
  const normalized = max > 0 ? Math.max(0, Math.min(100, Math.round((raw / max) * 100))) : 0;
  const bands = config.bands && config.bands.length ? config.bands : DEFAULT_BANDS;
  const band = bandForScore(normalized, bands);

  return { raw, max, normalized, band, byQuestion };
}
