import {
  calendlyCta,
  choice,
  funnelRec,
  num,
  opportunityBands,
  opts,
  OTHER,
  yesno,
  type FunnelTemplate,
} from "./builders";

/**
 * Funnel 1 — AI Automation Opportunity Assessment.
 *
 * Structured as the 7-stage customer journey (Your Business → Generate Your
 * Report). Industry-dynamic questions (Real Estate / HVAC / E-commerce) are
 * driven by the shared engine's conditional logic, the Manual Work stage feeds a
 * live labor-cost estimate, and the AI-maturity + impact/timeline answers drive
 * scoring and lead qualification.
 */

const INDUSTRY_OPTIONS = opts([
  ["IT / Software", "IT / Software"],
  ["E-commerce", "E-commerce"],
  ["Healthcare", "Healthcare"],
  ["Real Estate", "Real Estate"],
  ["Travel", "Travel"],
  ["Education", "Education / E-learning"],
  ["Telecom", "Telecom"],
  ["HVAC", "HVAC"],
  ["Gym / Fitness", "Gym / Fitness"],
  ["Salon / Beauty", "Salon / Beauty"],
]);

// Stage (section) names — these also drive the 7-node stepper order.
const S1 = "Your Business";
const S2 = "Your Operations";
const S3 = "Manual Work";
const S4 = "Automation Opportunities";
const S5 = "Quantify the Opportunity";
const S6 = "Final Details";

export const aiAutomationOpportunity: FunnelTemplate = {
  key: "ai-automation-opportunity",
  slug: "ai-automation-opportunity",
  name: "AI Automation Opportunity Assessment",
  tagline: "Find where automation pays you back first",
  description:
    "Identify repetitive business processes, automation opportunities, operational bottlenecks, and estimated automation potential.",
  objective: "Lead qualification + automation opportunity discovery",
  outcome: "A prioritised automation opportunity score with a recommended next step.",
  industries: ["All Industries"],
  goal: "Qualify Leads",
  settings: {
    goal: "Qualify Leads",
    stages: {
      [S1]: { short: "Your Business", subtitle: "Tell us about your business" },
      [S2]: { short: "Your Operations", subtitle: "Understanding your operations" },
      [S3]: { short: "Manual Work", subtitle: "Quantify the manual work" },
      [S4]: { short: "Opportunities", subtitle: "Automation opportunities" },
      [S5]: { short: "Quantify", subtitle: "AI & automation maturity" },
      [S6]: { short: "Final Details", subtitle: "Business impact & timeline" },
    },
    contactGate: {
      headline: "Unlock your detailed AI Automation Report.",
      subhead: "Enter your details to reveal your personalized results.",
      optional: ["phone", "company", "website", "job_title"],
    },
    result: {
      scoreLabel: "Automation Opportunity Score",
      primary: { from: "biggest_impact", label: "Primary Opportunity" },
      secondary: { from: "automate_what", label: "Where you'd start" },
      recommendedService: {
        map: [
          { min: 0, max: 30, text: "Automation Audit + Quick-Win Workflows" },
          { min: 31, max: 60, text: "CRM + Workflow Automation" },
          { min: 61, max: 80, text: "AI Agent + CRM Automation" },
          { min: 81, max: 100, text: "AI Agent + End-to-End Automation Platform" },
        ],
      },
    },
    cta: calendlyCta(),
  },
  questions: [
    // ── Stage 1 · Your Business ─────────────────────────────
    choice("industry", "What industry are you in?", INDUSTRY_OPTIONS, {
      required: true,
      display: "dropdown",
      section: S1,
      allowOther: true,
      help: "We tailor the assessment to your industry.",
    }),
    choice(
      "company_size",
      "How big is your team?",
      opts([
        ["1-10", "1–10"],
        ["11-50", "11–50"],
        ["51-200", "51–200"],
        ["201-1000", "201–1,000"],
        ["1000+", "1,000+"],
      ]),
      { required: true, section: S1 },
    ),
    choice(
      "business_model",
      "What's your business model?",
      opts([
        ["b2b", "B2B"],
        ["b2c", "B2C"],
        ["b2b2c", "B2B2C"],
        ["marketplace", "Marketplace"],
      ]).concat(OTHER),
      { required: true, section: S1, allowOther: true },
    ),

    // ── Stage 2 · Your Operations ───────────────────────────
    choice(
      "manual_time",
      "Where does your team spend the most manual time?",
      opts([
        ["support", "Customer support", 6],
        ["lead_qual", "Lead qualification", 7],
        ["appointment", "Appointment booking", 6],
        ["crm", "CRM updates", 5],
        ["data_entry", "Data entry", 6],
        ["followups", "Follow-ups", 6],
        ["reporting", "Reporting", 4],
        ["internal", "Internal workflows", 5],
        ["phone_calls", "Phone calls", 8],
      ]).concat(OTHER),
      {
        type: "multi_choice",
        required: true,
        section: S2,
        allowOther: true,
        help: "Select all that apply. This helps us identify your biggest automation opportunities.",
      },
    ),
    // Industry-dynamic branch — one shows based on the chosen industry.
    choice(
      "ops_real_estate",
      "Which of these slows your business most?",
      opts([
        ["inquiries", "Property inquiries", 10],
        ["lead_qual", "Lead qualification", 10],
        ["followup_speed", "Follow-up speed", 12],
        ["scheduling", "Appointment scheduling", 8],
        ["crm", "CRM usage", 8],
        ["drop_off", "Lead drop-off", 12],
      ]).concat(OTHER),
      { industry: "Real Estate", section: S2, allowOther: true },
    ),
    choice(
      "ops_hvac",
      "Where does your team lose the most time?",
      opts([
        ["service_calls", "Monthly service calls", 10],
        ["missed_calls", "Missed calls", 14],
        ["booking", "Appointment booking", 10],
        ["dispatch", "Technician dispatch", 8],
        ["estimates", "Estimates", 8],
        ["followups", "Follow-ups", 8],
        ["after_hours", "After-hours calls", 12],
      ]).concat(OTHER),
      { industry: "HVAC", section: S2, allowOther: true },
    ),
    choice(
      "ops_ecommerce",
      "Where does your team spend the most manual time?",
      opts([
        ["orders", "Monthly orders", 8],
        ["support", "Customer support volume", 12],
        ["repetitive_q", "Repetitive questions", 12],
        ["returns", "Returns / refunds", 8],
        ["recommendations", "Product recommendations", 8],
        ["lead_recovery", "Lead recovery", 10],
        ["inventory", "Inventory workflows", 6],
      ]).concat(OTHER),
      { industry: "E-commerce", section: S2, allowOther: true },
    ),

    // ── Stage 3 · Manual Work (quantify) ────────────────────
    num("employees", "How many employees perform this manual work?", {
      required: true,
      section: S3,
      validation: { min: 0, max: 100000, unit: "people" },
    }),
    num("hours_per_week", "How many hours does each spend on it per week?", {
      required: true,
      section: S3,
      validation: { min: 0, max: 168, unit: "hrs" },
    }),
    num("hourly_cost", "Approximate fully-loaded hourly cost", {
      type: "currency",
      required: true,
      section: S3,
      validation: { min: 0, max: 100000, unit: "$" },
      help: "We use this to estimate your current monthly labor cost.",
    }),

    // ── Stage 4 · Automation Opportunities ──────────────────
    choice(
      "automate_what",
      "What would you most like to automate?",
      opts([
        ["support", "Customer support"],
        ["lead_qual", "Lead qualification"],
        ["scheduling", "Appointment scheduling"],
        ["crm", "CRM updates"],
        ["followups", "Follow-ups"],
        ["data_entry", "Data entry"],
        ["reporting", "Reporting"],
        ["voice", "Voice calls"],
        ["internal", "Internal workflows"],
        ["marketing", "Marketing"],
      ]).concat(OTHER),
      { type: "multi_choice", required: true, section: S4, allowOther: true },
    ),
    choice(
      "frequency",
      "How often does this work happen?",
      opts([
        ["daily", "Many times a day", 12],
        ["daily_few", "A few times a day", 9],
        ["weekly", "Weekly", 6],
        ["monthly", "Monthly", 3],
      ]),
      { required: true, section: S4 },
    ),
    choice(
      "difficulty",
      "How hard is the process to get right?",
      opts([
        ["simple", "Simple & rules-based", 10],
        ["moderate", "Moderate", 7],
        ["complex", "Complex / judgement-heavy", 3],
      ]),
      { required: true, section: S4, insight: "Rules-based work automates fastest." },
    ),
    num("impact", "How big would automating this be for the business?", {
      type: "rating",
      required: true,
      section: S4,
      scoring: { mode: "linear", perUnit: 4, max: 20 },
      help: "1 = minor, 5 = transformational.",
    }),

    // ── Stage 5 · Quantify the Opportunity (AI maturity) ────
    yesno("using_ai", "Are you currently using AI in the business?", [4, 10], {
      required: true,
      section: S5,
      help: "There's more upside when you're just getting started.",
    }),
    choice(
      "ai_tools",
      "Which AI / automation tools are you using?",
      opts([
        ["chatgpt", "ChatGPT"],
        ["claude", "Claude"],
        ["n8n", "n8n"],
        ["make", "Make"],
        ["zapier", "Zapier"],
        ["gohighlevel", "GoHighLevel"],
        ["custom_ai", "Custom AI systems"],
        ["chatbot", "AI chatbot"],
        ["voice_ai", "Voice AI"],
        ["none", "None yet"],
      ]).concat(OTHER),
      { type: "multi_choice", section: S5, allowOther: true },
    ),
    choice(
      "workflow_automation",
      "How automated are your current workflows?",
      opts([
        ["manual", "Mostly manual", 12],
        ["some", "Some automation", 8],
        ["mostly", "Mostly automated", 4],
        ["advanced", "Advanced / AI-assisted", 2],
      ]),
      { required: true, section: S5 },
    ),

    // ── Stage 6 · Final Details (impact + qualification) ────
    choice(
      "biggest_impact",
      "What would have the biggest impact?",
      opts([
        ["cut_costs", "Reduce operating costs", 16],
        ["respond_faster", "Respond faster", 15],
        ["more_leads", "Generate more leads", 16],
        ["book_more", "Book more appointments", 14],
        ["reduce_missed", "Reduce missed calls", 14],
        ["reduce_workload", "Reduce employee workload", 14],
        ["improve_support", "Improve customer support", 13],
        ["scale", "Scale without hiring", 16],
        ["efficiency", "Improve internal efficiency", 13],
      ]),
      { required: true, section: S6, insight: "This becomes your primary automation opportunity." },
    ),
    choice(
      "timeline",
      "When are you looking to implement?",
      opts([
        ["now", "Immediately", 14],
        ["30d", "Within 30 days", 12],
        ["1-3m", "1–3 months", 8],
        ["3-6m", "3–6 months", 5],
        ["researching", "Just researching", 2],
      ]),
      { required: true, section: S6 },
    ),
  ],
  scoringRules: [{ industry: null, config: { bands: opportunityBands("Opportunity") } }],
  recommendations: [
    funnelRec(
      "ai-automation-roi-calculator",
      "AI Automation ROI Calculator",
      "You reported significant manual, repetitive workload — quantify the dollar impact next.",
      {
        match: "any",
        rules: [
          { when: "manual_time", op: "contains", value: "data_entry" },
          { when: "difficulty", op: "eq", value: "simple" },
        ],
      },
      1,
    ),
    funnelRec(
      "ai-voice-agent-assessment",
      "AI Voice Agent Assessment",
      "You indicated calls are a bottleneck — see how much of it a voice agent could absorb.",
      {
        match: "any",
        rules: [
          { when: "manual_time", op: "contains", value: "phone_calls" },
          { when: "biggest_impact", op: "eq", value: "reduce_missed" },
        ],
      },
      2,
    ),
    funnelRec(
      "ai-chatbot-rag-assessment",
      "AI Chatbot & RAG Assessment",
      "You flagged repetitive customer questions — a chatbot / knowledge assistant may be the fastest win.",
      {
        match: "any",
        rules: [
          { when: "manual_time", op: "contains", value: "support" },
          { when: "biggest_impact", op: "eq", value: "improve_support" },
        ],
      },
      3,
    ),
    funnelRec(
      "ai-agent-readiness-assessment",
      "AI Agent Readiness Assessment",
      "Your workload points to high-value AI agent opportunities — find the best-fit agent.",
      [{ when: "score", op: "gte", value: 61 }],
      4,
    ),
    funnelRec(
      "business-automation-scorecard",
      "Business Automation Scorecard",
      "Benchmark automation readiness across every department.",
      [{ when: "score", op: "lte", value: 60 }],
      5,
    ),
  ],
};
