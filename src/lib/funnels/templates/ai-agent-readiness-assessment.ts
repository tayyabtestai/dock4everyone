import {
  calendlyCta,
  choice,
  funnelRec,
  opportunityBands,
  opts,
  yesno,
  type FunnelTemplate,
} from "./builders";

/**
 * Funnel 4 — AI Agent Readiness Assessment.
 * Identifies where an AI agent / AI employee would create the most value, based
 * on the workloads the business handles manually today.
 */
const workload = (key: string, label: string) =>
  choice(
    key,
    label,
    opts([
      ["high", "High volume", 10],
      ["medium", "Some volume", 6],
      ["low", "Low volume", 2],
      ["none", "Not applicable", 0],
    ]),
    { required: false, section: "Workloads" },
  );

export const aiAgentReadinessAssessment: FunnelTemplate = {
  key: "ai-agent-readiness-assessment",
  slug: "ai-agent-readiness-assessment",
  name: "AI Agent Readiness Assessment",
  tagline: "Find where an AI employee pays off first",
  description:
    "Identify where an AI agent or AI employee could create the most value across your operation.",
  objective: "Identify the highest-value AI agent opportunity",
  outcome: "An AI agent opportunity score and your best-fit agent to deploy first.",
  industries: ["All Industries"],
  goal: "Recommend Solutions",
  settings: {
    goal: "Recommend Solutions",
    contactGate: {
      headline: "Your AI agent assessment is complete.",
      subhead: "Unlock your detailed AI agent readiness report.",
      optional: ["phone", "company", "website", "job_title"],
    },
    result: {
      scoreLabel: "AI Agent Opportunity Score",
      primary: { from: "highest_value", label: "Highest-Value Agent" },
      recommendedService: {
        map: [
          { min: 0, max: 40, text: "Single-Task AI Assistant" },
          { min: 41, max: 70, text: "AI Agent for Your Top Workflow" },
          { min: 71, max: 100, text: "Multi-Agent AI Workforce" },
        ],
      },
    },
    cta: calendlyCta(),
  },
  questions: [
    workload("support_load", "Customer support workload"),
    workload("leadqual_load", "Lead qualification workload"),
    workload("booking_load", "Appointment booking workload"),
    workload("inbound_calls", "Inbound call volume"),
    workload("outbound_calls", "Outbound call volume"),
    workload("data_entry", "Data entry & CRM updates"),
    workload("followups", "Follow-ups"),
    workload("research", "Research & reporting"),
    yesno("after_hours", "Do you lose opportunities after business hours?", [10, 0], {
      required: true,
      section: "Workloads",
    }),
    choice(
      "highest_value",
      "Which would help most if it ran itself?",
      opts([
        ["support_agent", "Customer Support Agent"],
        ["receptionist", "AI Receptionist"],
        ["booking_agent", "Appointment Booking Agent"],
        ["leadqual_agent", "Lead Qualification Agent"],
        ["inbound_agent", "Inbound Calling Agent"],
        ["outbound_agent", "Outbound Calling Agent"],
        ["ops_agent", "Internal Operations Agent"],
        ["research_agent", "Research Agent"],
        ["crm_agent", "CRM Agent"],
      ]),
      { required: true, section: "Priorities" },
    ),
  ],
  scoringRules: [{ industry: null, config: { bands: opportunityBands("Opportunity") } }],
  recommendations: [
    funnelRec(
      "ai-voice-agent-assessment",
      "AI Voice Agent Assessment",
      "You handle meaningful call volume — quantify the voice-agent opportunity.",
      {
        match: "any",
        rules: [
          { when: "inbound_calls", op: "eq", value: "high" },
          { when: "highest_value", op: "eq", value: "receptionist" },
          { when: "highest_value", op: "eq", value: "inbound_agent" },
        ],
      },
      1,
    ),
    funnelRec(
      "ai-chatbot-rag-assessment",
      "AI Chatbot & RAG Assessment",
      "High support workload suggests a chatbot / knowledge assistant is a fast win.",
      {
        match: "any",
        rules: [
          { when: "support_load", op: "eq", value: "high" },
          { when: "highest_value", op: "eq", value: "support_agent" },
        ],
      },
      2,
    ),
    funnelRec(
      "ai-automation-roi-calculator",
      "AI Automation ROI Calculator",
      "Put a dollar figure on automating your highest-volume workload.",
      [{ when: "score", op: "gte", value: 60 }],
      3,
    ),
  ],
};
