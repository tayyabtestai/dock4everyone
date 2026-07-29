// Reusable Revenue Recovery engine types. Calculator-agnostic — no product content lives here.

export type Industry = string;

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

export type Option = { value: string; label: string; score?: number };

export type Validation = {
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
};

/**
 * Branching condition tree. Evaluated against previously answered values.
 * Example:
 *   { all: [{ ref: "has_website", op: "eq", value: "yes" }] }
 */
export type Condition =
  | { ref: string; op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "truthy" | "falsy"; value?: unknown }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export type Question = {
  id: string;
  key: string;
  type: QuestionType;
  label: string;
  help?: string;
  tooltip?: string;
  insight?: string;
  section?: string;
  industry?: string | null;
  required?: boolean;
  options?: Option[];
  validation?: Validation;
  conditions?: Condition[];
  weight?: number;
  scoring?: Record<string, unknown>;
  orderIndex: number;
};

export type Answer = string | number | boolean | string[] | null;
export type Answers = Record<string, Answer>;

/** JSON-AST formula, evaluated by the whitelisted interpreter. */
export type Formula =
  | number
  | { const: number | string | boolean }
  | { ref: string } // dot-path into { answers, score, industry, questions, ... }
  | { op: "add" | "sub" | "mul" | "div" | "min" | "max" | "pct"; args: Formula[] }
  | { op: "if"; cond: Condition; then: Formula; else: Formula }
  | { op: "sum"; over: string; as: string; expr: Formula }
  | { op: "coalesce"; args: Formula[] };

export type ScoringBand = {
  key: string;
  label: string;
  min: number;
  max: number;
  copy?: string;
};

export type ScoringRules = {
  method: "weighted_sum" | "custom";
  scale?: { min: number; max: number };
  industryMultipliers?: Record<string, number>;
  bands?: ScoringBand[];
  financialImpact?: Record<string, Formula>;
  custom?: Formula;
};

export type RecommendationTrigger = {
  industry?: string;
  band?: string;
  when?: Condition;
};

export type Recommendation = {
  id: string;
  title: string;
  body: string;
  triggers: RecommendationTrigger;
  cta?: { label?: string; href?: string };
  orderIndex: number;
};

export type CalculatorConfig = {
  id: string;
  key: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  industries: string[];
  settings: {
    ctaLabel?: string;
    ctaHref?: string;
    calendlyUrl?: string;
    thankYouTitle?: string;
    thankYouBody?: string;
    leadForm?: { requirePhone?: boolean; requireCompany?: boolean; requireWebsite?: boolean };
    report?: { sections?: string[] };
    animations?: { enabled?: boolean };
  };
  questions: Question[];
  scoring: ScoringRules;
  recommendations: Recommendation[];
  version?: number;
  publishedAt?: string | null;
};

export type ReportPayload = {
  hero: { eyebrow: string; title: string; body: string };
  score: { value: number; scale: { min: number; max: number }; band?: ScoringBand };
  financialImpact: Record<string, number>;
  recommendations: Recommendation[];
  actionPlan: { title: string; steps: string[] };
  nextSteps: { title: string; body: string; cta?: { label?: string; href?: string } };
  breakdown: Record<string, number>;
};