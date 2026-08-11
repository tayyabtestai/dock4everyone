import {
  calendlyCta,
  choice,
  funnelRec,
  num,
  opportunityBands,
  opts,
  text,
  type FunnelTemplate,
} from "./builders";

/**
 * Funnel 2 — AI Automation ROI Calculator.
 * Quantify the financial opportunity from automation using the user's own
 * numbers. All figures are transparent, deterministic estimates: labor cost from
 * inputs, and an automation-potential percentage derived from the scored
 * questions (never a random number). Savings are never guaranteed.
 */
export const aiAutomationRoiCalculator: FunnelTemplate = {
  key: "ai-automation-roi-calculator",
  slug: "ai-automation-roi-calculator",
  name: "AI Automation ROI Calculator",
  tagline: "Model the true return before you commit",
  description:
    "Quantify the financial opportunity from automation across labor cost, time and rework — in your own numbers.",
  objective: "Quantify the financial opportunity from automation",
  outcome: "A transparent monthly and annual savings estimate based on your inputs.",
  industries: ["All Industries"],
  goal: "Calculate ROI",
  settings: {
    goal: "Calculate ROI",
    contactGate: {
      headline: "Your ROI estimate is ready.",
      subhead: "Unlock your detailed automation ROI report.",
      optional: ["phone", "company", "website", "job_title"],
    },
    result: {
      scoreLabel: "Estimated Automation Potential",
      recommendedService: {
        map: [
          { min: 0, max: 40, text: "Targeted Workflow Automation" },
          { min: 41, max: 70, text: "CRM + Workflow Automation" },
          { min: 71, max: 100, text: "AI Agent + End-to-End Automation" },
        ],
      },
    },
    calc: {
      outputs: [
        {
          key: "weekly_labor",
          label: "Current weekly labor cost",
          format: "currency",
          period: "per week",
          formula: "employees * hours_per_week * hourly_cost",
        },
        {
          key: "monthly_labor",
          label: "Current monthly labor cost",
          format: "currency",
          period: "per month",
          formula: "weekly_labor * WEEKS_PER_MONTH",
        },
        {
          key: "annual_labor",
          label: "Current annual labor cost",
          format: "currency",
          period: "per year",
          formula: "monthly_labor * MONTHS_PER_YEAR",
        },
        {
          key: "addressable_monthly",
          label: "Addressable monthly cost",
          format: "currency",
          hidden: true,
          formula: "monthly_labor + extra_monthly_cost + rework_cost",
        },
        {
          key: "automation_potential",
          label: "Estimated automation potential",
          format: "percent",
          formula: "score",
        },
        {
          key: "monthly_savings",
          label: "Estimated monthly savings",
          format: "currency",
          period: "per month",
          formula: "addressable_monthly * automation_pct",
        },
        {
          key: "annual_savings",
          label: "Estimated annual savings",
          format: "currency",
          period: "per year",
          formula: "monthly_savings * MONTHS_PER_YEAR",
        },
      ],
    },
    cta: calendlyCta(),
  },
  questions: [
    text("task_name", "Which task or process are you evaluating?", { section: "The task" }),
    num("employees", "How many employees perform this task?", {
      required: true,
      section: "The task",
      validation: { min: 0, max: 100000, unit: "people" },
    }),
    num("hours_per_week", "How many hours does each spend on it per week?", {
      required: true,
      section: "The task",
      validation: { min: 0, max: 168, unit: "hrs" },
    }),
    num("hourly_cost", "Average fully-loaded hourly cost", {
      type: "currency",
      required: true,
      section: "The task",
      validation: { min: 0, max: 100000, unit: "$" },
    }),
    num("times_per_month", "How many times does this process happen per month?", {
      section: "The task",
      validation: { min: 0, max: 1000000 },
    }),
    num("extra_monthly_cost", "Additional operational cost per month (optional)", {
      type: "currency",
      section: "Other costs",
      validation: { min: 0, max: 10000000, unit: "$" },
    }),
    num("rework_cost", "Current error / rework cost per month (optional)", {
      type: "currency",
      section: "Other costs",
      validation: { min: 0, max: 10000000, unit: "$" },
    }),

    // Scored — these drive the automation-potential percentage.
    choice(
      "repetitiveness",
      "How repetitive is this task?",
      opts([
        ["very", "Very — the same steps every time", 34],
        ["mostly", "Mostly repetitive", 24],
        ["mixed", "A mix of repetitive and judgement", 14],
        ["varied", "Highly varied", 6],
      ]),
      { required: true, section: "Automation fit" },
    ),
    choice(
      "rules_based",
      "How rules-based is the decision-making?",
      opts([
        ["clear", "Clear rules — little judgement", 34],
        ["some", "Some judgement required", 20],
        ["heavy", "Heavy judgement / expertise", 8],
      ]),
      { required: true, section: "Automation fit" },
    ),
    choice(
      "timeline",
      "When would you want this automated?",
      opts([
        ["now", "As soon as possible", 32],
        ["quarter", "This quarter", 24],
        ["half", "Next 6 months", 14],
        ["exploring", "Just exploring", 6],
      ]),
      { required: true, section: "Automation fit" },
    ),
  ],
  scoringRules: [{ industry: null, config: { bands: opportunityBands("ROI Potential") } }],
  recommendations: [
    funnelRec(
      "ai-automation-opportunity",
      "AI Automation Opportunity Assessment",
      "See the full picture of where automation fits across your operations.",
      [{ when: "output:monthly_savings", op: "gte", value: 1500 }],
      1,
    ),
    funnelRec(
      "ai-agent-readiness-assessment",
      "AI Agent Readiness Assessment",
      "Your task looks highly automatable — find the best-fit AI agent to own it.",
      [{ when: "score", op: "gte", value: 70 }],
      2,
    ),
  ],
};
