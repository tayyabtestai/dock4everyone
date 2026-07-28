export type Calculator = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  outcome: string;
};

export const CALCULATORS: Calculator[] = [
  {
    slug: "leakage",
    name: "Revenue Leakage Calculator",
    tagline: "Find every dollar quietly slipping out",
    description: "Pinpoint where revenue leaves your operation and estimate the annual value of each leak.",
    outcome: "Recover lost revenue",
  },
  {
    slug: "ai-opportunity",
    name: "AI Opportunity Scanner",
    tagline: "See which operations pay you back the fastest",
    description: "Uncover the specific workflows where intelligent systems generate the highest financial return.",
    outcome: "Prioritise the highest-impact opportunities",
  },
  {
    slug: "time-waste",
    name: "Time Waste Calculator",
    tagline: "Turn wasted hours into recovered profit",
    description: "Translate manual, repetitive work into the exact number of hours and dollars it costs each month.",
    outcome: "Reclaim hours across your team",
  },
  {
    slug: "lead-conversion",
    name: "Lead Conversion Audit",
    tagline: "Understand why prospects never become customers",
    description: "Diagnose the drop-off points in your funnel and estimate the revenue you leave on the table.",
    outcome: "Convert more of the leads you already earn",
  },
  {
    slug: "missed-calls",
    name: "Missed Calls Calculator",
    tagline: "Every unanswered call has a price",
    description: "Calculate the annual revenue lost to missed calls, voicemails and after-hours enquiries.",
    outcome: "Capture every inbound opportunity",
  },
  {
    slug: "appointment-recovery",
    name: "Appointment Recovery Calculator",
    tagline: "Rescue bookings before they disappear",
    description: "Quantify no-shows, cancellations and rescheduling gaps and see how much of that revenue is recoverable.",
    outcome: "Fill more of the calendar you already own",
  },
  {
    slug: "efficiency-score",
    name: "Business Efficiency Score",
    tagline: "A single score that maps operational health",
    description: "Benchmark day-to-day operations across time, tools, people and process to see where you truly stand.",
    outcome: "Understand operational strength at a glance",
  },
  {
    slug: "automation-report",
    name: "Automation Opportunity Report",
    tagline: "The blueprint for what to automate first",
    description: "Receive a prioritised, business-language plan for the systems that will pay for themselves fastest.",
    outcome: "Move forward with a clear implementation path",
  },
  {
    slug: "roi",
    name: "AI ROI Calculator",
    tagline: "Model the true return before you commit",
    description: "Project the financial impact of intelligent systems across revenue, cost and time in your own numbers.",
    outcome: "Make investment decisions with confidence",
  },
];
