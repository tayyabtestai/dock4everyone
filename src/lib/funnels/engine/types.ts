/**
 * Funnel Engine — shared type contracts.
 *
 * These types describe the JSON shapes stored in the existing `rr_*` tables
 * (rr_questions.options / conditions / scoring, rr_scoring_rules.config,
 * rr_recommendations.triggers / cta, rr_calculators.settings). Nothing here is
 * hard-coded to a specific funnel — every funnel is expressed as data using
 * these structures, so the same engine renders and scores all of them.
 *
 * This file is intentionally dependency-free (no `@/` imports, no zod) so the
 * engine can run in the browser, on the server, and under a plain Node harness
 * for verification.
 */

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

/** Matches the `rr_question_type` enum in the database. */
export type QuestionType =
  | "single_choice"
  | "multi_choice"
  | "number"
  | "currency"
  | "percentage"
  | "slider"
  | "rating"
  | "yes_no"
  | "short_text"
  | "long_text";

/** A selectable answer for choice-style questions. */
export type EngineOption = {
  value: string;
  label: string;
  /** Points contributed to the funnel score when this option is selected. */
  points?: number;
  /** Renders the "Tell us what you need" free-text field when chosen. */
  isOther?: boolean;
};

/** A single condition, evaluated against the current answers (or signals). */
export type ConditionOp =
  "eq" | "neq" | "in" | "nin" | "gt" | "gte" | "lt" | "lte" | "answered" | "contains";

export type Condition = {
  /** Answer key to read, or a signal name for triggers ("score", "industry", "output:<key>"). */
  when: string;
  op: ConditionOp;
  value?: JsonValue;
};

/** A group of conditions combined with all/any. A bare array means "all". */
export type ConditionGroup = { match: "all" | "any"; rules: Condition[] };

export type Conditions = Condition[] | ConditionGroup;

/** How a question contributes points to the score. */
export type QuestionScoring =
  | { mode: "none" }
  /** Sum the `points` of the selected option(s). */
  | { mode: "options" }
  /** Map a numeric answer into a band → points. */
  | { mode: "bands"; bands: ScoreBand[] }
  /** value * perUnit, optionally capped. */
  | { mode: "linear"; perUnit: number; max?: number }
  /** Fixed points when the question is answered at all. */
  | { mode: "constant"; points: number };

export type ScoreBand = { min?: number; max?: number; points: number };

export type Validation = {
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  /** Optional unit suffix for numeric inputs, e.g. "$", "hrs", "%". */
  unit?: string;
};

/** A question as the engine consumes it (normalised from an rr_questions row). */
export type EngineQuestion = {
  id?: string;
  key: string;
  type: QuestionType;
  label: string;
  help?: string;
  insight?: string;
  section?: string;
  required: boolean;
  /**
   * Industry targeting. null/"" or "All Industries" → shown for every industry.
   * Otherwise the question only appears when the chosen industry matches.
   */
  industry?: string | null;
  options: EngineOption[];
  /** Allow a free-text "Other" answer even without an explicit isOther option. */
  allowOther?: boolean;
  conditions: Conditions;
  weight: number;
  scoring: QuestionScoring;
  validation?: Validation;
  /** Renders single_choice as a dropdown rather than radio cards. */
  display?: "cards" | "dropdown";
};

/** A result band: maps a normalised 0–100 score to a qualification label. */
export type ResultBand = {
  min: number;
  max: number;
  label: string;
  readiness?: string;
  blurb?: string;
};

/** rr_scoring_rules.config — per funnel (and optionally per industry). */
export type ScoringConfig = {
  /** Override the normalisation denominator; otherwise computed from questions. */
  maxPoints?: number;
  bands?: ResultBand[];
};

/** A derived financial/quantitative output for calculator-style funnels. */
export type CalcOutput = {
  key: string;
  label: string;
  /** Expression over answer keys, prior output keys, `score`, and constants. */
  formula: string;
  format?: "number" | "currency" | "percent" | "hours";
  /** Display note, e.g. "per month". */
  period?: string;
  /** Hide from the headline result grid (used only as an intermediate value). */
  hidden?: boolean;
};

/** Call-to-action config (funnel-level, or per recommendation). */
export type Cta = {
  type?: "calendly" | "funnel" | "link";
  label?: string;
  /** For type "calendly" | "link". */
  url?: string;
  /** For type "funnel" — the slug to open next. */
  slug?: string;
};

/** rr_recommendations row (normalised). */
export type EngineRecommendation = {
  id?: string;
  order_index?: number;
  industry?: string | null;
  title: string;
  body: string;
  /** Reason shown to the user; falls back to `body`. */
  reason?: string;
  triggers: Conditions;
  cta: Cta;
};

/** Contact gate configuration (rr_calculators.settings.contactGate). */
export type ContactGateConfig = {
  headline?: string;
  subhead?: string;
  /** Optional fields to show in addition to the required First Name + Work Email. */
  optional?: Array<"last_name" | "phone" | "company" | "website" | "job_title">;
};

/** Result presentation config (rr_calculators.settings.result). */
export type ResultConfig = {
  scoreLabel?: string;
  /** Where the "primary opportunity" text comes from. */
  primary?: { from?: string; label?: string; text?: string };
  secondary?: { from?: string; label?: string; text?: string };
  /** Recommended service, either fixed or mapped by score band. */
  recommendedService?: { text?: string; map?: Array<{ min: number; max: number; text: string }> };
};

/** rr_calculators.settings shape the engine understands. */
export type FunnelSettings = {
  goal?: string;
  calc?: { outputs: CalcOutput[] };
  contactGate?: ContactGateConfig;
  result?: ResultConfig;
  cta?: Cta;
};

/**
 * The complete, self-contained funnel definition the engine executes. This is
 * the shape assembled by the builder and stored as a published version
 * snapshot (rr_calculator_versions.snapshot), and returned by
 * rr_get_published_by_slug.
 */
export type FunnelSnapshot = {
  id: string;
  key: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  industries: string[];
  settings: FunnelSettings;
  questions: EngineQuestion[];
  scoringRules: Array<{ industry: string | null; config: ScoringConfig }>;
  recommendations: EngineRecommendation[];
};

/** Answers keyed by question key. Multi-choice → string[]; "other" text → `${key}__other`. */
export type Answers = Record<string, JsonValue>;

export type Contact = {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  job_title?: string;
};

/** A named output value produced by the calculation engine. */
export type ComputedOutput = {
  key: string;
  label: string;
  value: number;
  format: NonNullable<CalcOutput["format"]>;
  period?: string;
};

export type ScoreResult = {
  raw: number;
  max: number;
  /** 0–100. */
  normalized: number;
  band: ResultBand;
  byQuestion: Record<string, number>;
};

export type SelectedRecommendation = {
  title: string;
  body: string;
  reason: string;
  cta: Cta;
};

/** The full personalised result the public funnel renders after the contact gate. */
export type FunnelResult = {
  score: ScoreResult;
  scoreLabel: string;
  outputs: ComputedOutput[];
  primary: string | null;
  secondary: string | null;
  recommendedService: string | null;
  recommendations: SelectedRecommendation[];
  cta: Cta;
  industry: string | null;
};

/** Default qualification bands (spec §SCORING ENGINE). */
export const DEFAULT_BANDS: ResultBand[] = [
  { min: 0, max: 30, label: "Low Opportunity", readiness: "Low" },
  { min: 31, max: 60, label: "Moderate Opportunity", readiness: "Moderate" },
  { min: 61, max: 80, label: "High Opportunity", readiness: "High" },
  { min: 81, max: 100, label: "Very High Opportunity", readiness: "Very High" },
];
