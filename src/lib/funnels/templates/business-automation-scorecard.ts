import {
  calendlyCta,
  choice,
  funnelRec,
  opportunityBands,
  opts,
  type FunnelTemplate,
} from "./builders";

/**
 * Funnel 3 — Business Automation Scorecard.
 * Measures automation readiness across the major business functions. Each
 * department contributes points; the overall normalised score maps to a
 * readiness band, and the respondent flags their highest-opportunity area.
 */
const maturity = (key: string, label: string, section: string) =>
  choice(
    key,
    label,
    opts([
      ["manual", "Mostly manual", 16],
      ["some", "Some tools, lots of manual", 11],
      ["automated", "Largely automated", 5],
      ["advanced", "Advanced / AI-assisted", 2],
    ]),
    { required: true, section },
  );

export const businessAutomationScorecard: FunnelTemplate = {
  key: "business-automation-scorecard",
  slug: "business-automation-scorecard",
  name: "Business Automation Scorecard",
  tagline: "A single score that maps operational health",
  description:
    "Measure automation readiness across operations, sales, marketing, support, admin and reporting.",
  objective: "Benchmark automation readiness across the business",
  outcome: "A department-by-department readiness score and your highest-opportunity area.",
  industries: ["All Industries"],
  goal: "Diagnose Problems",
  settings: {
    goal: "Diagnose Problems",
    contactGate: {
      headline: "Your scorecard is ready.",
      subhead: "Unlock your detailed automation readiness report.",
      optional: ["phone", "company", "website", "job_title"],
    },
    result: {
      scoreLabel: "Automation Readiness",
      primary: { from: "highest_opportunity", label: "Highest Opportunity" },
      recommendedService: {
        map: [
          { min: 0, max: 40, text: "Automation Roadmap + Quick Wins" },
          { min: 41, max: 70, text: "Cross-Department Workflow Automation" },
          { min: 71, max: 100, text: "AI Agents + Automation Platform" },
        ],
      },
    },
    cta: calendlyCta(),
  },
  questions: [
    maturity("ops_maturity", "How automated are your core Operations?", "Operations"),
    maturity("sales_maturity", "How automated is your Sales follow-up & pipeline?", "Sales"),
    maturity("marketing_maturity", "How automated is your Marketing?", "Marketing"),
    maturity("support_maturity", "How automated is Customer Support?", "Customer Support"),
    maturity("admin_maturity", "How automated is Administration & back-office?", "Administration"),
    maturity("data_maturity", "How automated is Data & Reporting?", "Data & Reporting"),
    choice(
      "highest_opportunity",
      "Where do you feel the biggest automation opportunity is?",
      opts([
        ["operations", "Operations"],
        ["sales", "Sales follow-up"],
        ["marketing", "Marketing"],
        ["support", "Customer Support"],
        ["admin", "Administration"],
        ["data", "Data & Reporting"],
      ]),
      { required: true, section: "Priorities" },
    ),
    choice(
      "ai_adoption",
      "How far along is your AI adoption overall?",
      opts([
        ["none", "Not started", 12],
        ["exploring", "Exploring", 9],
        ["piloting", "Piloting", 6],
        ["scaling", "Scaling", 3],
      ]),
      { required: true, section: "Priorities" },
    ),
  ],
  scoringRules: [{ industry: null, config: { bands: opportunityBands("Readiness") } }],
  recommendations: [
    funnelRec(
      "ai-automation-opportunity",
      "AI Automation Opportunity Assessment",
      "Turn your scorecard into a prioritised automation plan across operations.",
      [{ when: "score", op: "gte", value: 55 }],
      1,
    ),
    funnelRec(
      "ai-agent-readiness-assessment",
      "AI Agent Readiness Assessment",
      "Support and sales look highly automatable — see which AI agent fits best.",
      {
        match: "any",
        rules: [
          { when: "highest_opportunity", op: "eq", value: "support" },
          { when: "highest_opportunity", op: "eq", value: "sales" },
        ],
      },
      2,
    ),
  ],
};
