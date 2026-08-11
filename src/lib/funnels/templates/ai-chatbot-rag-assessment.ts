import {
  calendlyCta,
  choice,
  funnelRec,
  opportunityBands,
  opts,
  text,
  yesno,
  type FunnelTemplate,
} from "./builders";

/**
 * Funnel 6 — AI Chatbot & RAG Assessment.
 * Identifies businesses that can benefit from AI chatbots, knowledge assistants
 * or RAG systems, based on repetitive questions, channels and existing content.
 */
export const aiChatbotRagAssessment: FunnelTemplate = {
  key: "ai-chatbot-rag-assessment",
  slug: "ai-chatbot-rag-assessment",
  name: "AI Chatbot & RAG Assessment",
  tagline: "Answer every customer, instantly",
  description:
    "Identify whether an AI chatbot, knowledge assistant or RAG system can absorb your repetitive questions.",
  objective: "Identify the chatbot / knowledge automation opportunity",
  outcome: "A chatbot & RAG opportunity score with a recommended assistant type.",
  industries: ["All Industries"],
  goal: "Recommend Solutions",
  settings: {
    goal: "Recommend Solutions",
    contactGate: {
      headline: "Your chatbot assessment is complete.",
      subhead: "Unlock your detailed chatbot & knowledge automation report.",
      optional: ["phone", "company", "website", "job_title"],
    },
    result: {
      scoreLabel: "Chatbot & Knowledge Opportunity",
      primary: { from: "primary_need", label: "Recommended Assistant" },
      recommendedService: {
        map: [
          { min: 0, max: 40, text: "Website AI Chatbot" },
          { min: 41, max: 70, text: "AI Customer Support Chatbot" },
          { min: 71, max: 100, text: "RAG Knowledge Assistant + Support Chatbot" },
        ],
      },
    },
    cta: calendlyCta(),
  },
  questions: [
    yesno("repeat_questions", "Do customers repeatedly ask the same questions?", [16, 0], {
      required: true,
      section: "Your inquiries",
      insight: "Repetitive questions are the clearest chatbot opportunity.",
    }),
    choice(
      "inquiry_volume",
      "How many customer inquiries do you get?",
      opts([
        ["low", "Under 50 / month", 4],
        ["medium", "50–500 / month", 10],
        ["high", "500–2,000 / month", 16],
        ["very_high", "2,000+ / month", 22],
      ]),
      { required: true, section: "Your inquiries" },
    ),
    choice(
      "channels",
      "Where do customers ask questions?",
      opts([
        ["website", "Website"],
        ["whatsapp", "WhatsApp"],
        ["facebook", "Facebook"],
        ["instagram", "Instagram"],
        ["email", "Email"],
      ]).concat({ value: "other", label: "Other", isOther: true }),
      { type: "multi_choice", required: true, section: "Your inquiries", allowOther: true },
    ),
    text("common_questions", "What questions come up most often?", {
      long: true,
      section: "Your inquiries",
    }),
    yesno("manual_answers", "Do employees manually answer the same questions?", [12, 0], {
      section: "How you answer today",
    }),
    choice(
      "response_speed",
      "How quickly must customers get an answer?",
      opts([
        ["instant", "Instantly", 12],
        ["hour", "Within an hour", 8],
        ["day", "Within a day", 4],
      ]),
      { section: "How you answer today" },
    ),
    yesno("have_docs", "Do you have existing documentation?", [6, 0], {
      section: "Your knowledge",
    }),
    yesno("have_sops", "Do you have SOPs?", [6, 0], { section: "Your knowledge" }),
    yesno("have_kb", "Do you have a knowledge base?", [6, 0], { section: "Your knowledge" }),
    yesno("staff_search_time", "Do employees spend time searching internal info?", [10, 0], {
      section: "Your knowledge",
    }),
    yesno("benefit_247", "Would customers benefit from 24/7 answers?", [10, 0], {
      required: true,
      section: "Your knowledge",
    }),
    choice(
      "primary_need",
      "What would help most?",
      opts([
        ["support_bot", "AI Customer Support Chatbot"],
        ["rag_assistant", "RAG Knowledge Assistant"],
        ["internal_assistant", "Internal Company Assistant"],
        ["website_bot", "Website AI Chatbot"],
      ]),
      { required: true, section: "Priorities" },
    ),
  ],
  scoringRules: [{ industry: null, config: { bands: opportunityBands("Opportunity") } }],
  recommendations: [
    funnelRec(
      "ai-agent-readiness-assessment",
      "AI Agent Readiness Assessment",
      "Beyond chat, an AI agent could own the whole support workflow — see the fit.",
      [{ when: "score", op: "gte", value: 60 }],
      1,
    ),
    funnelRec(
      "ai-automation-opportunity",
      "AI Automation Opportunity Assessment",
      "Map chatbot wins into a broader automation plan.",
      [{ when: "repeat_questions", op: "eq", value: "yes" }],
      2,
    ),
  ],
};
