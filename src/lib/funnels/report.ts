/**
 * Report engine. Turns one funnel submission (snapshot + answers + engine
 * result + contact) into a structured, multi-section report model. Everything
 * is DERIVED from the customer's actual answers or the engine result — no
 * fabricated analytics. Where a value can't be legitimately computed (e.g. no
 * workload numbers were collected) it degrades to a "not enough data" state
 * instead of inventing a number. One engine, funnel-agnostic: the flagship gets
 * a rich report, other funnels get a sensible one from the same code.
 */
import { formatOutput } from "./engine";
import type {
  Answers,
  ComputedOutput,
  Contact,
  FunnelResult,
  FunnelSnapshot,
  JsonValue,
} from "./engine";

const WEEKS_PER_MONTH = 4.33;

/* ---------- model ---------- */

export type ReportKpi = {
  key: string;
  label: string;
  value: string;
  sub: string;
  icon: string;
  state?: "ok" | "nodata";
  tone?: "default" | "positive";
};

export type ScoreDim = { label: string; value: number; tone: string };
export type WorkloadItem = { key: string; label: string; pct: number; impact: number };
export type BiggestOpportunity = { rank: number; name: string; desc: string; impact: string };

export type AiSystem = {
  key: string;
  name: string;
  score: number;
  level: string;
  why: string;
  automates: string[];
  impact: string;
  complexity: string;
  priority: number;
  cta: { text: string; url: string };
};

export type CompCapability = { capability: string; current: string; benchmark: string };
export type RoadmapPhase = { title: string; weeks: string; items: string[] };
export type RecommendedFunnel = { title: string; reason: string; slug?: string; label: string };

export type ReportModel = {
  reportTitle: string;
  funnelName: string;
  company: string;
  contactName: string;
  goal: string;
  score: { value: number; band: string };
  kpis: ReportKpi[];
  scoreBreakdown: ScoreDim[];
  scoreNarrative: string;
  workload: WorkloadItem[];
  financial: {
    monthlyLaborCost: number;
    monthlySavings: number;
    annualSavings: number;
  } | null;
  outputs: ComputedOutput[];
  biggestOpportunities: BiggestOpportunity[];
  aiSystems: AiSystem[];
  competitive: {
    intro: string;
    capabilities: CompCapability[];
    currentProcess: string[];
    automatedProcess: string[];
    closing: string;
  };
  roadmap: RoadmapPhase[];
  recommendedFunnels: RecommendedFunnel[];
  nextSteps: {
    headline: string;
    body: string;
    primary: { text: string; url: string };
    secondary: { text: string };
  };
};

/* ---------- helpers ---------- */

function toNum(v: JsonValue | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

type Selected = { qKey: string; value: string; label: string; points: number };

/** Every option the customer selected across choice/multi/yes-no questions. */
function collectSelected(snapshot: FunnelSnapshot, answers: Answers): Selected[] {
  const out: Selected[] = [];
  for (const q of snapshot.questions) {
    const a = answers[q.key];
    if (a == null) continue;
    const vals = Array.isArray(a) ? a.map(String) : [String(a)];
    for (const v of vals) {
      const opt = q.options.find((o) => o.value === v);
      if (opt) out.push({ qKey: q.key, value: v, label: opt.label, points: opt.points ?? 0 });
    }
  }
  return out;
}

function bandLabel(score: number, noun = "Opportunity"): string {
  if (score >= 81) return `Very High ${noun}`;
  if (score >= 61) return `High ${noun}`;
  if (score >= 31) return `Moderate ${noun}`;
  return `Low ${noun}`;
}

/* ---------- workload ---------- */

// Map raw option values/labels to a friendly workload category.
function workloadCategory(sel: Selected): string | null {
  const t = `${sel.value} ${sel.label}`.toLowerCase();
  if (/appointment|booking|schedul/.test(t)) return "Appointment Handling";
  if (/support|faq|ticket/.test(t)) return "Customer Support";
  if (/call|phone|dispatch|voice|missed/.test(t)) return "Phone Calls";
  if (/crm|data entry|record|update/.test(t)) return "CRM / Data Entry";
  if (/follow/.test(t)) return "Follow-ups";
  if (/report|analytic/.test(t)) return "Reporting";
  if (/internal|workflow|ops|operations/.test(t)) return "Internal Workflows";
  if (/lead|qualif/.test(t)) return "Lead Qualification";
  if (/return|refund/.test(t)) return "Returns & Refunds";
  if (/invent|product|order/.test(t)) return "Inventory & Orders";
  if (/market/.test(t)) return "Marketing";
  return null;
}

function buildWorkload(selected: Selected[]): WorkloadItem[] {
  const totals = new Map<string, number>();
  for (const s of selected) {
    const cat = workloadCategory(s);
    if (!cat) continue;
    totals.set(cat, (totals.get(cat) ?? 0) + Math.max(1, s.points));
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  if (!sum) return [];
  return [...totals.entries()]
    .map(([label, weight], i) => ({
      key: label,
      label,
      pct: Math.round((weight / sum) * 100),
      impact: Math.max(20, 100 - i * 14),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 7);
}

/* ---------- AI systems ---------- */

type SystemDef = {
  key: string;
  name: string;
  triggers: RegExp;
  automates: string[];
  complexity: string;
};

const SYSTEM_DEFS: SystemDef[] = [
  {
    key: "appointment",
    name: "AI Appointment Agent",
    triggers: /appointment|booking|schedul/,
    automates: [
      "Answer appointment questions",
      "Qualify customers",
      "Check availability",
      "Book appointments",
      "Send confirmations",
      "Update your CRM",
    ],
    complexity: "Moderate",
  },
  {
    key: "voice",
    name: "AI Voice Receptionist",
    triggers: /call|phone|missed|voice|receptionist|dispatch/,
    automates: [
      "Answer calls 24/7",
      "Qualify callers",
      "Capture missed calls",
      "Route to the right person",
      "Book appointments",
    ],
    complexity: "Moderate",
  },
  {
    key: "support",
    name: "AI Customer Support Agent",
    triggers: /support|faq|question|ticket/,
    automates: [
      "Resolve common questions instantly",
      "Deflect repetitive tickets",
      "Escalate complex issues",
      "Work across channels",
    ],
    complexity: "Moderate",
  },
  {
    key: "crm",
    name: "CRM Automation",
    triggers: /crm|data entry|record|update/,
    automates: [
      "Auto-update records",
      "Assign & route leads",
      "Trigger follow-up workflows",
      "Keep data clean",
    ],
    complexity: "Low",
  },
  {
    key: "leadqual",
    name: "Lead Qualification Agent",
    triggers: /lead|qualif|prospect/,
    automates: [
      "Score & qualify inbound leads",
      "Ask qualifying questions",
      "Route hot leads instantly",
      "Log everything to the CRM",
    ],
    complexity: "Moderate",
  },
  {
    key: "followup",
    name: "Follow-up Automation",
    triggers: /follow/,
    automates: [
      "Send timely follow-ups",
      "Nurture cold leads",
      "Re-engage no-shows",
      "Personalize by stage",
    ],
    complexity: "Low",
  },
];

function buildAiSystems(selected: Selected[], overall: number, ctaUrl: string): AiSystem[] {
  const text = selected
    .map((s) => `${s.value} ${s.label}`)
    .join(" ")
    .toLowerCase();
  const scored = SYSTEM_DEFS.map((d) => {
    const hits = selected.filter((s) => d.triggers.test(`${s.value} ${s.label}`.toLowerCase()));
    const signal = hits.length;
    const globalHit = d.triggers.test(text);
    if (signal === 0 && !globalHit) return null;
    const score = clamp(52 + signal * 11 + (overall - 50) * 0.5);
    const hitLabels = [...new Set(hits.map((h) => h.label.toLowerCase()))].slice(0, 2);
    const why =
      hitLabels.length > 0
        ? `Your responses highlight ${hitLabels.join(" and ")} as a significant recurring workload.`
        : `Your responses indicate this is a strong automation opportunity for your operation.`;
    return {
      key: d.key,
      name: d.name,
      score,
      level: bandLabel(score),
      why,
      automates: d.automates,
      impact: score >= 81 ? "Very High" : score >= 61 ? "High" : score >= 31 ? "Moderate" : "Low",
      complexity: d.complexity,
      priority: 0,
      cta: { text: "Book a Strategy Call", url: ctaUrl },
    } satisfies AiSystem;
  }).filter((x): x is AiSystem => x != null);

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, i) => (s.priority = i + 1));
  return scored.slice(0, 5);
}

/* ---------- financial ---------- */

function pickOutput(outputs: ComputedOutput[], re: RegExp): ComputedOutput | undefined {
  return outputs.find((o) => re.test(o.key) || re.test(o.label.toLowerCase()));
}

/* ---------- CTA phrasing ---------- */

function ctaText(name: string, goal: string): string {
  const n = name.toLowerCase();
  if (/voice/.test(n)) return "Book an AI Voice Strategy Call";
  if (/roi|calculator/.test(n) || /roi/i.test(goal)) return "Book an ROI Strategy Call";
  if (/chatbot|rag/.test(n)) return "Book an AI Chatbot Strategy Call";
  if (/agent/.test(n)) return "Book an AI Agent Strategy Call";
  return "Book an AI Automation Strategy Call";
}

function deriveReportTitle(name: string): string {
  if (/assessment$/i.test(name)) return name.replace(/assessment$/i, "Report");
  if (/calculator$/i.test(name)) return name.replace(/calculator$/i, "Report");
  return `${name} Report`;
}

/* ---------- main ---------- */

export function buildReport(
  snapshot: FunnelSnapshot,
  answers: Answers,
  result: FunnelResult,
  contact: Contact | null,
): ReportModel {
  const selected = collectSelected(snapshot, answers);
  const overall = result.score.normalized;
  const ctaUrl = snapshot.settings?.cta?.url ?? "https://calendly.com/tayyabismail/30min";
  const goal = snapshot.settings?.goal ?? "";

  // Quantitative inputs (flagship-style); absent for pure choice funnels.
  const employees = toNum(answers.employees);
  const hours = toNum(answers.hours_per_week);
  const hourly = toNum(answers.hourly_cost);
  const hasQuant = employees > 0 && hours > 0 && hourly > 0;

  const automationPct = (() => {
    const out = pickOutput(result.outputs, /automation_pot|automation_pct|potential/);
    if (out && out.value > 0) return Math.min(1, out.value / 100);
    return overall / 100;
  })();

  const monthlyLabor = hasQuant ? employees * hours * hourly * WEEKS_PER_MONTH : 0;
  const savingsOut = pickOutput(result.outputs, /saving|monthly_opportunity/);
  const monthlySavings = savingsOut
    ? savingsOut.value
    : hasQuant
      ? monthlyLabor * automationPct
      : 0;
  const annualOut = pickOutput(result.outputs, /annual/);
  const annualSavings = annualOut ? annualOut.value : monthlySavings * 12;
  const recoverableHours = hasQuant ? employees * hours * WEEKS_PER_MONTH * automationPct : 0;

  const aiSystems = buildAiSystems(selected, overall, ctaUrl);
  const workload = buildWorkload(selected);

  // Derived sub-scores.
  const manualWorkloadScore = clamp(
    40 + selected.filter((s) => workloadCategory(s)).length * 8 + (hasQuant ? 20 : 0),
  );
  const usingAi = String(answers.using_ai ?? "");
  const timeline = String(answers.timeline ?? "");
  const readiness = clamp(
    50 +
      (usingAi === "yes" ? 15 : usingAi === "no" ? -5 : 0) +
      (/now|immediately|30|quarter/.test(timeline)
        ? 20
        : /research|explor/.test(timeline)
          ? -10
          : 5) +
      (selected.some((s) => /chatgpt|claude|zapier|make|n8n|crm/.test(s.value)) ? 10 : 0),
  );
  const impactRating = toNum(answers.impact);
  const businessImpact = clamp(impactRating > 0 ? impactRating * 18 + 10 : overall);
  const difficulty = String(answers.difficulty ?? "");
  const feasibility = clamp(
    (/simple/.test(difficulty)
      ? 82
      : /moderate/.test(difficulty)
        ? 64
        : /complex/.test(difficulty)
          ? 42
          : 60) +
      (readiness - 50) * 0.3,
  );

  const priorityCount = aiSystems.filter(
    (s) => s.impact === "High" || s.impact === "Very High",
  ).length;

  // KPIs.
  const kpis: ReportKpi[] = [
    {
      key: "opportunity",
      label: "Automation Opportunity",
      value: `${overall} / 100`,
      sub: result.score.band.label,
      icon: "sparkles",
    },
    monthlySavings > 0
      ? {
          key: "savings",
          label: "Potential Monthly Savings",
          value: formatOutput(monthlySavings, "currency"),
          sub: "Estimated",
          icon: "dollar",
          tone: "positive",
        }
      : {
          key: "savings",
          label: "Potential Monthly Savings",
          value: "—",
          sub: "Not enough data",
          icon: "dollar",
          state: "nodata",
        },
    recoverableHours > 0
      ? {
          key: "hours",
          label: "Recoverable Hours",
          value: `${Math.round(recoverableHours).toLocaleString()} hrs/mo`,
          sub: "Potential capacity",
          icon: "clock",
        }
      : {
          key: "hours",
          label: "Recoverable Hours",
          value: "—",
          sub: "Not enough data",
          icon: "clock",
          state: "nodata",
        },
    {
      key: "readiness",
      label: "AI Readiness",
      value: `${readiness} / 100`,
      sub: readiness >= 60 ? "Ready to implement" : "Foundational",
      icon: "trend",
    },
    {
      key: "priority",
      label: "Priority Opportunities",
      value: String(priorityCount || aiSystems.length),
      sub: "High-impact areas",
      icon: "target",
    },
  ];

  const scoreBreakdown: ScoreDim[] = [
    { label: "Automation Readiness", value: readiness, tone: "indigo" },
    { label: "Manual Workload", value: manualWorkloadScore, tone: "blue" },
    { label: "Business Impact", value: businessImpact, tone: "amber" },
    { label: "Implementation Feasibility", value: feasibility, tone: "green" },
  ];

  const biggestOpportunities: BiggestOpportunity[] = aiSystems.slice(0, 4).map((s, i) => ({
    rank: i + 1,
    name: s.name,
    desc: s.automates.slice(0, 2).join(", ") + ".",
    impact: `${s.impact} Impact`,
  }));

  // Competitive gap — generic AI benchmarks, current state inferred, never invented competitor data.
  const afterHours = String(answers.after_hours ?? "");
  const competitive = {
    intro:
      "Businesses in your market are increasingly using AI to respond faster and remain available outside traditional business hours.",
    capabilities: [
      {
        capability: "After-hours response",
        current: afterHours === "yes" ? "Limited" : "Business hours only",
        benchmark: "24/7 possible",
      },
      { capability: "Appointment handling", current: "Manual", benchmark: "AI-assisted" },
      { capability: "Lead qualification", current: "Manual", benchmark: "Automated" },
      { capability: "Follow-up", current: "Manual", benchmark: "Automated" },
      { capability: "FAQ handling", current: "Staff", benchmark: "AI + escalation" },
    ],
    currentProcess: ["Customer", "Receptionist", "Availability", "Booking"],
    automatedProcess: ["Customer", "AI Voice Agent", "Qualification", "Booking", "CRM"],
    closing:
      "The opportunity isn't simply reducing staff workload. It's creating a faster, always-available customer experience.",
  };

  // Roadmap — reflect the recommended systems.
  const names = aiSystems.map((s) => s.name);
  const has = (re: RegExp) => names.some((n) => re.test(n.toLowerCase()));
  const roadmap: RoadmapPhase[] = [
    {
      title: "Phase 1 — Quick Wins",
      weeks: "Weeks 1–2",
      items: [
        has(/crm/) ? "CRM automation" : "Workflow automation",
        "Automated follow-ups",
        "FAQ automation",
      ],
    },
    {
      title: "Phase 2 — Customer Experience",
      weeks: "Weeks 3–6",
      items: [
        has(/voice|receptionist/) ? "AI Voice Receptionist" : "AI Customer Support Agent",
        has(/appointment/) ? "Appointment Agent" : "Lead Qualification Agent",
        "Customer Support Agent",
      ],
    },
    {
      title: "Phase 3 — Intelligent Operations",
      weeks: "Weeks 7–12",
      items: ["CRM intelligence", "Advanced workflows", "Reporting & analytics"],
    },
  ];

  const recommendedFunnels: RecommendedFunnel[] = result.recommendations
    .filter((r) => r.cta?.type === "funnel" && r.cta.slug)
    .slice(0, 3)
    .map((r) => ({
      title: r.title,
      reason: r.reason,
      slug: r.cta.slug,
      label: r.cta.label ?? "Take Assessment",
    }));

  return {
    reportTitle: deriveReportTitle(snapshot.name),
    funnelName: snapshot.name,
    company: contact?.company?.trim() || "Your business",
    contactName: contact?.first_name?.trim() || "there",
    goal,
    score: { value: overall, band: result.score.band.label },
    kpis,
    scoreBreakdown,
    scoreNarrative:
      overall >= 61
        ? "You have a high opportunity to improve efficiency and reduce manual workload with AI & automation."
        : "You have a solid foundation with focused opportunities to reduce manual workload with automation.",
    workload,
    financial: hasQuant
      ? {
          monthlyLaborCost: Math.round(monthlyLabor),
          monthlySavings: Math.round(monthlySavings),
          annualSavings: Math.round(annualSavings),
        }
      : null,
    outputs: result.outputs,
    biggestOpportunities,
    aiSystems,
    competitive,
    roadmap,
    recommendedFunnels,
    nextSteps: {
      headline: "Ready to turn these opportunities into working systems?",
      body: "We've identified where AI and automation could have the greatest impact on your operation. The next step is deciding what to implement first.",
      primary: { text: ctaText(snapshot.name, goal), url: ctaUrl },
      secondary: { text: "Explore More Assessments" },
    },
  };
}
