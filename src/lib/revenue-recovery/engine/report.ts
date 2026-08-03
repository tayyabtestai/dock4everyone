import type { Answers, CalculatorConfig, ReportPayload } from "./types";
import { computeScore, computeFinancialImpact } from "./scoring";
import { selectRecommendations } from "./recommendations";

export function buildReport(
  config: CalculatorConfig,
  answers: Answers,
  industry?: string | null,
): ReportPayload & { scoreValue: number; breakdown: Record<string, number> } {
  const { score, breakdown, band } = computeScore(config, answers, industry);
  const financialImpact = computeFinancialImpact(config, answers, score, industry);
  const recommendations = selectRecommendations(config, answers, band, industry);
  const scale = config.scoring.scale ?? { min: 0, max: 100 };
  const labels: Record<string, string> = {};
  for (const q of config.questions) if (q.label) labels[q.key] = q.label;
  return {
    hero: { eyebrow: config.tagline, title: config.name, body: config.description },
    score: { value: score, scale, band },
    financialImpact,
    recommendations,
    actionPlan: { title: "Action Plan", steps: [] },
    nextSteps: {
      title: config.settings.thankYouTitle ?? "Book a strategy call",
      body: config.settings.thankYouBody ?? "",
      cta: { label: config.settings.ctaLabel, href: config.settings.ctaHref ?? config.settings.calendlyUrl },
    },
    breakdown,
    labels,
    industry: industry ?? null,
    generatedAt: new Date().toISOString(),
    scoreValue: score,
  };
}