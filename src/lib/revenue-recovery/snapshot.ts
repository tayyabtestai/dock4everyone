import type { CalculatorConfig, Question, Recommendation, ScoringRules } from "./engine/types";

export function snapshotToConfig(input: {
  calculator: any;
  questions: any[];
  scoring: any[];
  recommendations: any[];
  version?: number;
  publishedAt?: string | null;
}): CalculatorConfig {
  const genericScoring = input.scoring.find((s: any) => !s.industry) ?? input.scoring[0];
  const rules: ScoringRules = genericScoring?.config ?? { method: "weighted_sum" };
  return {
    id: input.calculator.id,
    key: input.calculator.key,
    slug: input.calculator.slug,
    name: input.calculator.name,
    tagline: input.calculator.tagline ?? "",
    description: input.calculator.description ?? "",
    industries: input.calculator.industries ?? [],
    settings: input.calculator.settings ?? {},
    questions: (input.questions ?? []).map((q: any): Question => ({
      id: q.id,
      key: q.key,
      type: q.type,
      label: q.label,
      help: q.help,
      tooltip: q.tooltip,
      insight: q.insight,
      section: q.section ?? undefined,
      industry: q.industry ?? null,
      required: q.required,
      options: q.options ?? [],
      validation: q.validation ?? {},
      conditions: q.conditions ?? [],
      weight: q.weight,
      scoring: q.scoring ?? {},
      orderIndex: q.order_index,
    })),
    scoring: rules,
    recommendations: (input.recommendations ?? []).map((r: any): Recommendation => ({
      id: r.id,
      title: r.title,
      body: r.body,
      triggers: r.triggers ?? {},
      cta: r.cta ?? {},
      orderIndex: r.order_index,
    })),
    version: input.version,
    publishedAt: input.publishedAt ?? null,
  };
}