import {
  calendlyCta,
  choice,
  funnelRec,
  num,
  opportunityBands,
  opts,
  OTHER,
  text,
  type FunnelTemplate,
} from "./builders";

/**
 * Funnel 1 — AI Automation Opportunity Assessment.
 * Understand the business, find manual processes, score automation potential,
 * qualify the lead, and recommend the next step. Includes industry-dynamic
 * questions (Real Estate / HVAC / E-commerce) driven by the shared engine's
 * conditional logic, not separate funnels.
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
    contactGate: {
      headline: "Your assessment is complete.",
      subhead: "Unlock your detailed AI Automation Report.",
      optional: ["phone", "company", "website", "job_title"],
    },
    result: {
      scoreLabel: "Automation Opportunity Score",
      primary: { from: "biggest_bottleneck", label: "Primary Opportunity" },
      secondary: { from: "automate_most", label: "Where you'd start" },
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
    // Step 1 — Tell us about your business
    choice("industry", "What industry are you in?", INDUSTRY_OPTIONS, {
      required: true,
      display: "dropdown",
      section: "Your business",
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
      { required: true, section: "Your business" },
    ),
    choice(
      "business_model",
      "What's your business model?",
      opts([
        ["b2b", "B2B"],
        ["b2c", "B2C"],
        ["b2b2c", "B2B2C"],
        ["marketplace", "Marketplace"],
        ...([["other", "Other"]] as [string, string][]),
      ]),
      { section: "Your business", allowOther: true },
    ),
    choice(
      "current_crm",
      "Which CRM do you use?",
      opts([
        ["hubspot", "HubSpot"],
        ["salesforce", "Salesforce"],
        ["pipedrive", "Pipedrive"],
        ["zoho", "Zoho"],
        ["spreadsheets", "Spreadsheets / none"],
      ]).concat(OTHER),
      { section: "Current tools", allowOther: true },
    ),
    choice(
      "automation_tools",
      "Which automation tools do you already use?",
      opts([
        ["zapier", "Zapier"],
        ["make", "Make"],
        ["n8n", "n8n"],
        ["native", "Native app automations"],
        ["none", "None yet"],
      ]).concat(OTHER),
      { type: "multi_choice", section: "Current tools", allowOther: true },
    ),
    choice(
      "ai_tools",
      "Which AI tools do you already use?",
      opts([
        ["chatgpt", "ChatGPT / Claude"],
        ["copilots", "In-app copilots"],
        ["custom", "Custom AI"],
        ["none", "None yet"],
      ]).concat(OTHER),
      { type: "multi_choice", section: "Current tools", allowOther: true },
    ),

    // Step 2 — Understand your operations (scored)
    choice(
      "manual_processes",
      "What processes are currently manual?",
      opts([
        ["lead_qual", "Lead qualification", 6],
        ["followup", "Follow-up & nurture", 6],
        ["scheduling", "Appointment scheduling", 5],
        ["data_entry", "Data entry & CRM updates", 6],
        ["support", "Customer support", 5],
        ["reporting", "Reporting", 4],
        ["invoicing", "Invoicing & admin", 4],
      ]).concat(OTHER),
      {
        type: "multi_choice",
        required: true,
        section: "Your operations",
        allowOther: true,
        insight: "The more manual processes, the higher the automation upside.",
      },
    ),
    choice(
      "repetitive_work",
      "What repetitive work consumes the most team time?",
      opts([
        ["answering_calls", "Answering & routing calls", 12],
        ["answering_questions", "Answering the same questions", 12],
        ["manual_followup", "Manual follow-ups", 14],
        ["manual_data", "Copying data between tools", 12],
        ["qualifying", "Qualifying leads", 14],
      ]).concat(OTHER),
      { required: true, section: "Your operations", allowOther: true },
    ),
    choice(
      "biggest_bottleneck",
      "What's your biggest operational bottleneck?",
      opts([
        ["lead_response", "Slow lead response & follow-up", 18],
        ["call_handling", "Call handling & missed calls", 16],
        ["support_volume", "Customer support volume", 15],
        ["manual_ops", "Manual back-office operations", 14],
        ["scheduling", "Scheduling & no-shows", 13],
      ]).concat(OTHER),
      {
        required: true,
        section: "Your operations",
        allowOther: true,
        insight: "This becomes your primary automation opportunity.",
      },
    ),

    // Industry-dynamic question — one shows based on the chosen industry
    choice(
      "time_loss_real_estate",
      "Where do you lose the most time?",
      opts([
        ["lead_qual", "Lead qualification", 10],
        ["followup", "Follow-up", 12],
        ["scheduling", "Appointment scheduling", 8],
        ["crm", "CRM updates", 8],
        ["inquiries", "Property inquiries", 10],
        ["support", "Customer support", 8],
        ["marketing", "Marketing", 6],
      ]).concat(OTHER),
      { industry: "Real Estate", section: "Your operations", allowOther: true },
    ),
    choice(
      "time_loss_hvac",
      "Where does your team spend the most manual time?",
      opts([
        ["answering_calls", "Answering calls", 12],
        ["booking", "Booking appointments", 10],
        ["lead_qual", "Lead qualification", 10],
        ["dispatching", "Dispatching technicians", 8],
        ["followups", "Follow-ups", 8],
        ["estimates", "Estimates", 8],
        ["support", "Customer support", 6],
      ]).concat(OTHER),
      { industry: "HVAC", section: "Your operations", allowOther: true },
    ),
    choice(
      "time_loss_ecommerce",
      "Where does your team spend the most manual time?",
      opts([
        ["support", "Customer support", 12],
        ["order_questions", "Order questions", 10],
        ["returns", "Returns / refunds", 8],
        ["recommendations", "Product recommendations", 8],
        ["lead_recovery", "Lead recovery", 10],
        ["marketing", "Marketing", 6],
        ["inventory", "Inventory workflows", 6],
      ]).concat(OTHER),
      { industry: "E-commerce", section: "Your operations", allowOther: true },
    ),

    // Step 3 — Quantify (scored)
    num("employees_involved", "How many employees are involved in that work?", {
      section: "Team workload",
      validation: { min: 0, max: 100000, unit: "people" },
    }),
    choice(
      "frequency",
      "How frequently does the process happen?",
      opts([
        ["daily", "Many times a day", 12],
        ["daily_few", "A few times a day", 9],
        ["weekly", "Weekly", 6],
        ["monthly", "Monthly", 3],
      ]),
      { required: true, section: "Team workload" },
    ),
    choice(
      "difficulty",
      "How difficult is the process to do well?",
      opts([
        ["simple", "Simple & rules-based", 10],
        ["moderate", "Moderate", 7],
        ["complex", "Complex / judgement-heavy", 3],
      ]),
      {
        section: "Team workload",
        insight: "Rules-based work automates fastest.",
      },
    ),
    choice(
      "manual_work_amount",
      "How much of it is manual, repetitive effort?",
      opts([
        ["most", "Most of it", 12],
        ["half", "About half", 8],
        ["some", "Some of it", 4],
      ]),
      { section: "Team workload" },
    ),
    choice(
      "automate_most",
      "What would you most like to automate?",
      opts([
        ["lead_followup", "Lead qualification & follow-up"],
        ["calls", "Calls & appointment booking"],
        ["support", "Customer support"],
        ["backoffice", "Back-office & data entry"],
        ["reporting", "Reporting & insights"],
      ]).concat(OTHER),
      { required: true, section: "Priorities", allowOther: true },
    ),

    // Step 4 — Readiness (scored)
    choice(
      "timeline",
      "What's your implementation timeline?",
      opts([
        ["now", "As soon as possible", 10],
        ["quarter", "This quarter", 8],
        ["half", "Next 6 months", 5],
        ["exploring", "Just exploring", 2],
      ]),
      { required: true, section: "Readiness" },
    ),
    choice(
      "automation_experience",
      "What's your automation experience?",
      opts([
        ["none", "None — starting fresh", 8],
        ["some", "Some workflows in place", 6],
        ["advanced", "Advanced / already automating", 4],
      ]),
      { section: "Readiness" },
    ),
    choice(
      "business_priority",
      "What's the priority behind this?",
      opts([
        ["growth", "Grow revenue"],
        ["cost", "Cut cost"],
        ["capacity", "Free up team capacity"],
        ["cx", "Improve customer experience"],
      ]),
      { section: "Readiness" },
    ),
    text("anything_else", "Anything else we should know?", { long: true, section: "Readiness" }),
  ],
  scoringRules: [{ industry: null, config: { bands: opportunityBands("Opportunity") } }],
  recommendations: [
    funnelRec(
      "ai-automation-roi-calculator",
      "AI Automation ROI Calculator",
      "You reported significant manual, repetitive workload — quantify the dollar impact next.",
      [{ when: "manual_work_amount", op: "eq", value: "most" }],
      1,
    ),
    funnelRec(
      "ai-voice-agent-assessment",
      "AI Voice Agent Assessment",
      "You indicated call handling is a bottleneck — see how much of it a voice agent could absorb.",
      {
        match: "any",
        rules: [
          { when: "biggest_bottleneck", op: "eq", value: "call_handling" },
          { when: "repetitive_work", op: "eq", value: "answering_calls" },
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
          { when: "biggest_bottleneck", op: "eq", value: "support_volume" },
          { when: "repetitive_work", op: "eq", value: "answering_questions" },
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
