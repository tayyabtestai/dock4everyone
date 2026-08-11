import {
  calendlyCta,
  choice,
  funnelRec,
  num,
  opportunityBands,
  opts,
  yesno,
  type FunnelTemplate,
} from "./builders";

/**
 * Funnel 5 — AI Voice Agent Assessment.
 * Identifies businesses that can benefit from AI voice agents and quantifies the
 * opportunity from missed calls and after-hours demand. All figures are
 * estimates derived from the caller's own inputs; annual always = monthly × 12.
 */
export const aiVoiceAgentAssessment: FunnelTemplate = {
  key: "ai-voice-agent-assessment",
  slug: "ai-voice-agent-assessment",
  name: "AI Voice Agent Assessment",
  tagline: "Every unanswered call has a price",
  description:
    "Identify whether an AI voice agent can capture missed calls, after-hours demand and appointment opportunities.",
  objective: "Quantify the AI voice agent opportunity",
  outcome: "An estimate of recoverable calls, appointment opportunities and revenue.",
  industries: ["All Industries"],
  goal: "Calculate ROI",
  settings: {
    goal: "Calculate ROI",
    contactGate: {
      headline: "Your voice agent assessment is ready.",
      subhead: "Unlock your detailed voice agent opportunity report.",
      optional: ["phone", "company", "website", "job_title"],
    },
    result: {
      scoreLabel: "Voice Agent Opportunity",
      recommendedService: {
        map: [
          { min: 0, max: 40, text: "After-Hours Voice Assistant" },
          { min: 41, max: 70, text: "AI Receptionist + Booking" },
          { min: 71, max: 100, text: "Full AI Voice Agent + CRM" },
        ],
      },
    },
    calc: {
      outputs: [
        {
          key: "monthly_calls",
          label: "Estimated calls received monthly",
          format: "number",
          period: "per month",
          formula: "calls_per_month",
        },
        {
          key: "missed_calls",
          label: "Estimated missed calls",
          format: "number",
          period: "per month",
          formula: "calls_per_month * missed_pct / 100",
        },
        {
          key: "handled_auto",
          label: "Calls that could be handled automatically",
          format: "number",
          period: "per month",
          formula: "calls_per_month * automation_pct",
        },
        {
          key: "appointment_ops",
          label: "Estimated appointment opportunities",
          format: "number",
          period: "per month",
          formula: "calls_per_month * appointment_pct / 100",
        },
        {
          key: "monthly_opportunity",
          label: "Estimated monthly opportunity",
          format: "currency",
          period: "per month",
          formula: "missed_calls * avg_call_value",
        },
        {
          key: "annual_opportunity",
          label: "Estimated annual opportunity",
          format: "currency",
          period: "per year",
          formula: "monthly_opportunity * MONTHS_PER_YEAR",
        },
      ],
    },
    cta: calendlyCta(),
  },
  questions: [
    num("calls_per_month", "How many calls do you receive per month?", {
      required: true,
      section: "Your calls",
      validation: { min: 0, max: 1000000, unit: "calls" },
      scoring: {
        mode: "bands",
        bands: [
          { max: 100, points: 6 },
          { min: 101, max: 500, points: 14 },
          { min: 501, points: 22 },
        ],
      },
    }),
    num("missed_pct", "Roughly what % of calls go unanswered?", {
      type: "percentage",
      required: true,
      section: "Your calls",
      validation: { min: 0, max: 100, unit: "%" },
      scoring: {
        mode: "bands",
        bands: [
          { max: 5, points: 4 },
          { min: 6, max: 20, points: 12 },
          { min: 21, points: 20 },
        ],
      },
    }),
    num("appointment_pct", "What % of calls are appointment-related?", {
      type: "percentage",
      section: "Your calls",
      validation: { min: 0, max: 100, unit: "%" },
    }),
    yesno("after_hours", "Do customers call after business hours?", [14, 0], {
      required: true,
      section: "How calls are handled",
    }),
    yesno("manual_qualify", "Do staff manually qualify callers?", [10, 0], {
      section: "How calls are handled",
    }),
    yesno("manual_booking", "Do staff manually book appointments?", [10, 0], {
      section: "How calls are handled",
    }),
    choice(
      "phone_system",
      "Which phone system do you use?",
      opts([
        ["voip", "VoIP (e.g. RingCentral, Twilio)"],
        ["landline", "Traditional landline"],
        ["mobile", "Mobile only"],
        ["mixed", "Mixed"],
      ]).concat({ value: "other", label: "Other", isOther: true }),
      { section: "How calls are handled", allowOther: true },
    ),
    num("staff_count", "How many staff handle calls?", {
      section: "How calls are handled",
      validation: { min: 0, max: 100000, unit: "people" },
    }),
    num("avg_call_value", "Average value of an appointment / customer", {
      type: "currency",
      required: true,
      section: "Value",
      validation: { min: 0, max: 10000000, unit: "$" },
    }),
  ],
  scoringRules: [{ industry: null, config: { bands: opportunityBands("Opportunity") } }],
  recommendations: [
    funnelRec(
      "ai-automation-opportunity",
      "AI Automation Opportunity Assessment",
      "See where else automation can capture value beyond the phones.",
      [{ when: "score", op: "gte", value: 55 }],
      1,
    ),
    funnelRec(
      "ai-chatbot-rag-assessment",
      "AI Chatbot & RAG Assessment",
      "Many callers ask the same things — a chatbot could deflect them before they call.",
      [{ when: "manual_qualify", op: "eq", value: "yes" }],
      2,
    ),
  ],
};
