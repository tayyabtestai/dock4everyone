/**
 * Authoring helpers for funnel templates. A template is a plain, declarative
 * description of a funnel (meta + questions + scoring + recommendations) using
 * the engine's own types. The installer turns a template into rr_* rows; the
 * engine executes it. Keeping templates as data (not code) is what lets the
 * builder edit them and lets new funnels ship without new frontend code.
 */
import type {
  Conditions,
  Cta,
  EngineOption,
  EngineQuestion,
  EngineRecommendation,
  FunnelSettings,
  QuestionScoring,
  ScoringConfig,
  Validation,
} from "@/lib/funnels/engine";

export type FunnelTemplate = {
  key: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Primary objective, shown on the template selection card. */
  objective: string;
  /** Expected outcome, shown on the template selection card. */
  outcome: string;
  /** Recommended industries (labels). */
  industries: string[];
  /** Funnel goal (Generate Leads, Calculate ROI, …). */
  goal: string;
  settings: FunnelSettings;
  questions: EngineQuestion[];
  scoringRules: Array<{ industry: string | null; config: ScoringConfig }>;
  recommendations: EngineRecommendation[];
};

/** An "Other — tell us what you need" option. */
export const OTHER: EngineOption = { value: "other", label: "Other", isOther: true };

/** Build option objects from compact [value, label, points?] tuples. */
export function opts(list: Array<[value: string, label: string, points?: number]>): EngineOption[] {
  return list.map(([value, label, points]) => ({
    value,
    label,
    ...(points != null ? { points } : {}),
  }));
}

type ChoiceOpts = {
  type?: "single_choice" | "multi_choice";
  required?: boolean;
  industry?: string | null;
  section?: string;
  help?: string;
  insight?: string;
  conditions?: Conditions;
  allowOther?: boolean;
  display?: "cards" | "dropdown";
  /** Defaults to option-based scoring when any option has points. */
  scoring?: QuestionScoring;
};

function optionScoringDefault(
  options: EngineOption[],
  override?: QuestionScoring,
): QuestionScoring {
  if (override) return override;
  return options.some((o) => (o.points ?? 0) !== 0) ? { mode: "options" } : { mode: "none" };
}

/** A single- or multi-choice question. */
export function choice(
  key: string,
  label: string,
  options: EngineOption[],
  o: ChoiceOpts = {},
): EngineQuestion {
  return {
    key,
    type: o.type ?? "single_choice",
    label,
    required: o.required ?? false,
    industry: o.industry ?? null,
    section: o.section,
    help: o.help,
    insight: o.insight,
    options,
    allowOther: o.allowOther ?? options.some((op) => op.isOther),
    conditions: o.conditions ?? [],
    weight: 0,
    scoring: optionScoringDefault(options, o.scoring),
    display: o.display,
  };
}

type NumOpts = {
  type?: "number" | "currency" | "percentage" | "slider" | "rating";
  required?: boolean;
  industry?: string | null;
  section?: string;
  help?: string;
  insight?: string;
  conditions?: Conditions;
  validation?: Validation;
  scoring?: QuestionScoring;
};

/** A numeric / currency / percentage question. */
export function num(key: string, label: string, o: NumOpts = {}): EngineQuestion {
  return {
    key,
    type: o.type ?? "number",
    label,
    required: o.required ?? false,
    industry: o.industry ?? null,
    section: o.section,
    help: o.help,
    insight: o.insight,
    options: [],
    conditions: o.conditions ?? [],
    weight: 0,
    scoring: o.scoring ?? { mode: "none" },
    validation: o.validation,
  };
}

type YesNoOpts = Omit<ChoiceOpts, "type" | "display">;

/** A yes/no question. `points` order is [yesPoints, noPoints]. */
export function yesno(
  key: string,
  label: string,
  points: [yes: number, no: number] = [0, 0],
  o: YesNoOpts = {},
): EngineQuestion {
  return {
    key,
    type: "yes_no",
    label,
    required: o.required ?? false,
    industry: o.industry ?? null,
    section: o.section,
    help: o.help,
    insight: o.insight,
    options: [
      { value: "yes", label: "Yes", points: points[0] },
      { value: "no", label: "No", points: points[1] },
    ],
    conditions: o.conditions ?? [],
    weight: 0,
    scoring: points[0] || points[1] ? { mode: "options" } : { mode: "none" },
  };
}

/** A short/long free-text question. */
export function text(
  key: string,
  label: string,
  o: {
    long?: boolean;
    required?: boolean;
    industry?: string | null;
    section?: string;
    help?: string;
    conditions?: Conditions;
  } = {},
): EngineQuestion {
  return {
    key,
    type: o.long ? "long_text" : "short_text",
    label,
    required: o.required ?? false,
    industry: o.industry ?? null,
    section: o.section,
    help: o.help,
    options: [],
    conditions: o.conditions ?? [],
    weight: 0,
    scoring: { mode: "none" },
  };
}

/** Shared Calendly CTA (the URL is configurable per funnel, defaulting here). */
export const DEFAULT_CALENDLY = "https://calendly.com/tayyabismail/30min";

export function calendlyCta(label = "Book an AI Automation Strategy Call"): Cta {
  return { type: "calendly", label, url: DEFAULT_CALENDLY };
}

/** A cross-funnel recommendation pointing at another funnel by slug. */
export function funnelRec(
  slug: string,
  title: string,
  reason: string,
  triggers: Conditions,
  order_index: number,
): EngineRecommendation {
  return {
    order_index,
    title,
    body: reason,
    reason,
    triggers,
    cta: { type: "funnel", slug, label: "Take Assessment" },
  };
}

/** Standard qualification bands with funnel-appropriate labels. */
export function opportunityBands(noun = "Opportunity"): ScoringConfig["bands"] {
  return [
    { min: 0, max: 30, label: `Low ${noun}`, readiness: "Low" },
    { min: 31, max: 60, label: `Moderate ${noun}`, readiness: "Moderate" },
    { min: 61, max: 80, label: `High ${noun}`, readiness: "High" },
    { min: 81, max: 100, label: `Very High ${noun}`, readiness: "Very High" },
  ];
}

/** The standard contact gate (First Name + Work Email required; rest optional). */
export const STANDARD_GATE: FunnelSettings["contactGate"] = {
  headline: "Your assessment is complete.",
  subhead: "Unlock your detailed report.",
  optional: ["phone", "company", "website", "job_title"],
};
