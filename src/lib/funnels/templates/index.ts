/**
 * Template registry. Every built-in funnel is a data-only template here. New
 * funnels can be added to this list (or created in the builder) without touching
 * the engine or any funnel-specific frontend — one engine renders them all.
 */
import type { FunnelTemplate } from "./builders";
import { aiAutomationOpportunity } from "./ai-automation-opportunity";
import { aiAutomationRoiCalculator } from "./ai-automation-roi-calculator";

export type { FunnelTemplate } from "./builders";

export const FUNNEL_TEMPLATES: FunnelTemplate[] = [
  aiAutomationOpportunity,
  aiAutomationRoiCalculator,
];

export const TEMPLATE_BY_KEY: Record<string, FunnelTemplate> = Object.fromEntries(
  FUNNEL_TEMPLATES.map((t) => [t.key, t]),
);

/** Lightweight cards for the "Create from template" gallery. */
export function templateCards() {
  return FUNNEL_TEMPLATES.map((t) => ({
    key: t.key,
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    objective: t.objective,
    outcome: t.outcome,
    industries: t.industries,
    goal: t.goal,
    questionCount: t.questions.length,
  }));
}
