// Resolves the public calculator experience (copy, flow, report layout) from
// admin-editable calculator settings. No calculator content is hardcoded here —
// only neutral platform-level fallbacks for chrome the user never authors.
import type { CalculatorConfig } from "./engine/types";

export type LandingCopy = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryCta: string;
  secondaryCta?: string;
  secondaryCtaHref?: string;
};

export type ExperienceConfig = {
  landing: LandingCopy;
  industryPrompt: string;
  progressMessages: string[];
  analysis: { headline: string; lines: string[]; durationMs: number };
  leadForm: {
    title: string;
    subtitle: string;
    submitLabel: string;
    consentText?: string;
    requirePhone: boolean;
    requireCompany: boolean;
    requireWebsite: boolean;
  };
  liveEstimate: { enabled: boolean; label: string };
  report: ReportLayout;
};

export type ReportLayout = {
  monthlyKey?: string;
  annualKey?: string;
  monthlyLabel?: string;
  annualLabel?: string;
  scoreLabel: string;
  benchmarks: { label: string; you?: number; industry?: number; unit?: string }[];
  outcomes: string[];
  roadmap: { phase: string; title: string; body?: string }[];
  nextActions: string[];
  systemsTag?: string;
  pdf: { brandName?: string; footnote?: string };
  ctaPrimary: string;
  ctaSecondary?: string;
};

const DEFAULT_PROGRESS = [
  "Finding hidden revenue…",
  "Checking customer journey…",
  "Analysing response times…",
  "Measuring operational efficiency…",
  "Calculating missed opportunities…",
  "Building your personalised report…",
];

const DEFAULT_ANALYSIS = [
  "Checking revenue leaks…",
  "Comparing industry benchmarks…",
  "Calculating financial impact…",
  "Identifying automation opportunities…",
  "Preparing recommendations…",
];

type AnySettings = Record<string, any>;

export function resolveExperience(config: CalculatorConfig): ExperienceConfig {
  const s = (config.settings ?? {}) as AnySettings;
  const landing = (s.landing ?? {}) as AnySettings;
  const analysis = (s.analysis ?? {}) as AnySettings;
  const lead = (s.leadForm ?? {}) as AnySettings;
  const report = (s.report ?? {}) as AnySettings;
  const live = (s.liveEstimate ?? {}) as AnySettings;

  return {
    landing: {
      eyebrow: landing.eyebrow ?? config.tagline ?? "",
      headline: landing.headline ?? config.name,
      subheadline: landing.subheadline ?? config.description ?? "",
      primaryCta: landing.primaryCta ?? "Start Free Analysis",
      secondaryCta: landing.secondaryCta,
      secondaryCtaHref: landing.secondaryCtaHref,
    },
    industryPrompt: s.industryPrompt ?? "Which best describes your business?",
    progressMessages: arr(s.progressMessages) ?? DEFAULT_PROGRESS,
    analysis: {
      headline: analysis.headline ?? "Analysing Your Business…",
      lines: arr(analysis.lines) ?? DEFAULT_ANALYSIS,
      durationMs: num(analysis.durationMs) ?? 12000,
    },
    leadForm: {
      title: lead.title ?? "Where should we send your report?",
      subtitle: lead.subtitle ?? "",
      submitLabel: lead.submitLabel ?? s.ctaLabel ?? "Generate My Revenue Report",
      consentText: lead.consentText,
      requirePhone: !!lead.requirePhone,
      requireCompany: lead.requireCompany !== false,
      requireWebsite: !!lead.requireWebsite,
    },
    liveEstimate: {
      enabled: live.enabled !== false,
      label: live.label ?? "Revenue impact updated",
    },
    report: {
      monthlyKey: report.monthlyKey,
      annualKey: report.annualKey,
      monthlyLabel: report.monthlyLabel,
      annualLabel: report.annualLabel,
      scoreLabel: report.scoreLabel ?? "Revenue Recovery Score",
      benchmarks: arr(report.benchmarks) ?? [],
      outcomes: arr(report.outcomes) ?? [],
      roadmap: arr(report.roadmap) ?? [],
      nextActions: arr(report.nextActions) ?? [],
      systemsTag: report.systemsTag,
      pdf: (report.pdf ?? {}) as { brandName?: string; footnote?: string },
      ctaPrimary: report.ctaPrimary ?? s.ctaLabel ?? "Book Strategy Session",
      ctaSecondary: report.ctaSecondary ?? "Download PDF",
    },
  };
}

function arr<T>(v: unknown): T[] | undefined {
  return Array.isArray(v) && v.length ? (v as T[]) : undefined;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Autosave helpers — progress is resumable per calculator slug. */
export type SavedProgress = { industry: string | null; answers: Record<string, unknown>; stepKey?: string; savedAt: number };

export function loadProgress(slug: string): SavedProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`rr:${slug}:progress`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProgress;
    if (!parsed || typeof parsed !== "object") return null;
    // expire after 14 days
    if (Date.now() - (parsed.savedAt ?? 0) > 14 * 864e5) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveProgress(slug: string, p: Omit<SavedProgress, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`rr:${slug}:progress`, JSON.stringify({ ...p, savedAt: Date.now() }));
  } catch { /* storage unavailable */ }
}

export function clearProgress(slug: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(`rr:${slug}:progress`); } catch { /* noop */ }
}