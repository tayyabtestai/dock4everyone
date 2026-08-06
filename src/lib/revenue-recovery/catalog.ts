export type Calculator = {
  /** Admin key — used in /admin/revenue-recovery/$key */
  key: string;
  /** Public slug — used in /rr/$slug */
  publicSlug: string;
  name: string;
  tagline: string;
  description: string;
  outcome: string;
};

export const CALCULATORS: Calculator[] = [
  {
    key: "leakage",
    publicSlug: "revenue-leakage",
    name: "Revenue Leakage Calculator",
    tagline: "Find every dollar quietly slipping out",
    description: "Pinpoint where revenue leaves your operation and estimate the annual value of each leak.",
    outcome: "Recover lost revenue",
  },
  {
    key: "missed-calls",
    publicSlug: "missed-calls",
    name: "Missed Calls Calculator",
    tagline: "Every unanswered call has a price",
    description: "Calculate the annual revenue lost to missed calls, voicemails and after-hours enquiries.",
    outcome: "Capture every inbound opportunity",
  },
  {
    key: "lead-conversion",
    publicSlug: "lead-conversion",
    name: "Lead Conversion Audit",
    tagline: "Understand why prospects never become customers",
    description: "Diagnose the drop-off points in your funnel and estimate the revenue you leave on the table.",
    outcome: "Convert more of the leads you already earn",
  },
  {
    key: "time-waste",
    publicSlug: "time-waste",
    name: "Time Waste Calculator",
    tagline: "Turn wasted hours into recovered profit",
    description: "Translate manual, repetitive work into the exact number of hours and dollars it costs each month.",
    outcome: "Reclaim hours across your team",
  },
  {
    key: "roi",
    publicSlug: "ai-roi",
    name: "AI ROI Calculator",
    tagline: "Model the true return before you commit",
    description: "Project the financial impact of intelligent systems across revenue, cost and time in your own numbers.",
    outcome: "Make investment decisions with confidence",
  },
];
