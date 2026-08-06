// Generates SQL that seeds the Revenue Recovery calculators with real,
// admin-editable question sets, scoring rules and recommendations.
import { writeFileSync } from "node:fs";

const INDUSTRIES = [
  "Dental Practice","Medical Clinic","Law Firm","Accounting Firm","Real Estate Agency",
  "Home Services","Auto Services","Fitness Studio","Beauty & Aesthetics",
  "Veterinary Clinic","Construction & Trades","Professional Services",
];

const o = (value, label, score) => ({ value: String(value), label, score });
const ref = (k) => ({ ref: `answers.${k}` });
const mul = (...args) => ({ op: "mul", args });
const add = (...args) => ({ op: "add", args });
const sub = (...args) => ({ op: "sub", args });
const div = (...args) => ({ op: "div", args });
const min = (...args) => ({ op: "min", args });

const KEEP = ["leakage", "missed-calls", "lead-conversion", "time-waste", "roi"];
const DROP = ["ai-opportunity", "appointment-recovery", "efficiency-score", "automation-report"];

// ---------- shared copy ----------
const progress = [
  "Finding hidden revenue…",
  "Checking your customer journey…",
  "Measuring response times…",
  "Reviewing day-to-day operations…",
  "Calculating missed opportunities…",
  "Building your personalised report…",
];
const analysisLines = [
  "Reading your answers…",
  "Comparing against industry benchmarks…",
  "Calculating financial impact…",
  "Identifying the biggest opportunities…",
  "Writing your recommendations…",
];

function settings({ landing, report, thankYouTitle, thankYouBody, liveLabel }) {
  return {
    ctaLabel: "Book a strategy call",
    ctaHref: "",
    calendlyUrl: "",
    thankYouTitle,
    thankYouBody,
    industryPrompt: "Which best describes your business?",
    progressMessages: progress,
    analysis: { headline: "Analysing Your Business…", lines: analysisLines, durationMs: 12000 },
    leadForm: {
      title: "Where should we send your report?",
      subtitle: "Your results are ready. Tell us where to send them and we'll email a copy you can keep.",
      submitLabel: "Show me my results",
      consentText: "I'm happy for Dock to contact me about these results. No spam, ever.",
      requirePhone: false, requireCompany: true, requireWebsite: false,
    },
    liveEstimate: { enabled: true, label: liveLabel },
    landing,
    report,
  };
}

// ---------- calculators ----------
const CALCS = [];

CALCS.push({
  key: "leakage",
  slug: "revenue-leakage",
  name: "Revenue Leakage Calculator",
  tagline: "Find every dollar quietly slipping out",
  description: "A short, guided conversation that shows exactly where revenue leaves your business — and what it is worth each year.",
  outcome: "Recover lost revenue",
  settings: settings({
    liveLabel: "Estimated opportunity updated",
    thankYouTitle: "Want help stopping these leaks?",
    thankYouBody: "We'll walk through your report together and map the systems that close the biggest gaps first. No pitch, no pressure.",
    landing: {
      eyebrow: "Revenue Recovery Platform",
      headline: "Find the revenue quietly leaving your business.",
      subheadline: "Answer a few plain-English questions about how your business runs. In about three minutes you'll see where revenue is leaking, what it costs you each year, and how much of it is realistically recoverable.",
      primaryCta: "Start free analysis",
    },
    report: {
      scoreLabel: "Revenue health score",
      monthlyKey: "monthly_leak", annualKey: "annual_leak",
      monthlyLabel: "Estimated monthly revenue leakage",
      annualLabel: "Estimated annual revenue leakage",
      outcomes: [
        "Every enquiry answered, including after hours",
        "Follow-up that happens the same way every time",
        "Fewer no-shows and late cancellations",
        "Hours of admin handed back to your team",
      ],
      roadmap: [
        { phase: "Days 1–30", title: "Stop the biggest leak", body: "Close the single gap costing you the most — usually unanswered enquiries and slow response." },
        { phase: "Days 31–60", title: "Systemise follow-up", body: "Put a consistent, automatic follow-up rhythm behind every enquiry that doesn't convert immediately." },
        { phase: "Days 61–90", title: "Protect the calendar", body: "Reminders, confirmations and re-engagement so booked revenue actually shows up." },
      ],
      nextActions: [
        "Review the three largest leaks with your team this week",
        "Agree a maximum response time for new enquiries",
        "Choose one repetitive task to remove from your team entirely",
      ],
      pdf: { brandName: "Dock", footnote: "Estimates are directional and based on the answers provided plus service-industry benchmarks." },
      ctaPrimary: "Book a strategy call",
      ctaSecondary: "Download PDF",
    },
  }),
  questions: [
    { key: "monthly_revenue", type: "currency", section: "Snapshot", required: true, label: "Roughly what does your business bring in each month?", help: "A ballpark is fine. We only use it to size the numbers in your report.", validation: { min: 0 } },
    { key: "avg_customer_value", type: "currency", section: "Snapshot", required: true, label: "What is one new customer typically worth to you?", help: "Average value of the work a new customer brings over their first year.", validation: { min: 0 } },
    { key: "monthly_enquiries", type: "number", section: "Snapshot", required: true, label: "How many new enquiries do you get in a typical month?", help: "Calls, forms, messages and walk-ins combined.", validation: { min: 0 } },
    { key: "missed_call_rate", type: "single_choice", section: "Customers", required: true, weight: 1, label: "Out of every ten calls, how many go unanswered?", insight: "Most service businesses miss around one call in four — and eight out of ten callers never leave a voicemail.", options: [o(0.05, "Almost none — we answer nearly every call", 10), o(0.2, "One or two", 7), o(0.35, "Three or four", 4), o(0.55, "Five or more", 0)] },
    { key: "response_time", type: "single_choice", section: "Customers", required: true, weight: 1, label: "When a new enquiry arrives, how quickly does someone reply?", insight: "Replying within five minutes can make a lead many times more likely to convert than replying an hour later.", options: [o(0.02, "Within five minutes", 10), o(0.12, "Within an hour", 7), o(0.25, "Same day", 4), o(0.4, "Next day or later", 0)] },
    { key: "followup", type: "single_choice", section: "Customers", required: true, weight: 1, label: "What happens to someone who enquires but doesn't buy straight away?", insight: "Most sales need several follow-ups. Most businesses stop after one.", options: [o(0.05, "A structured follow-up sequence runs every time", 10), o(0.15, "We follow up when we remember", 5), o(0.3, "Nothing formal happens", 0)] },
    { key: "after_hours", type: "yes_no", section: "Customers", required: true, weight: 1, label: "Do enquiries that arrive after hours get a reply before the next working day?", options: [o("yes", "Yes — they're handled", 10), o("no", "No — they wait", 0)] },
    { key: "no_show_rate", type: "percentage", section: "Operations", required: true, label: "What share of booked jobs or appointments no-show or cancel late?", help: "Your best estimate as a percentage.", validation: { min: 0, max: 100 } },
    { key: "manual_hours", type: "number", section: "Operations", required: true, label: "How many hours a week does your team spend on admin a system could handle?", help: "Scheduling, data entry, chasing payments, sending reminders.", validation: { min: 0 } },
    { key: "hourly_cost", type: "currency", section: "Operations", required: true, label: "What does an hour of that team time cost you?", validation: { min: 0 } },
    { key: "systems", type: "single_choice", section: "Operations", required: true, weight: 1, label: "How joined-up are the tools you run the business on?", options: [o(0.05, "One system — everything connected", 10), o(0.15, "A few tools that mostly talk to each other", 6), o(0.3, "Spreadsheets and manual handoffs", 0)] },
    { key: "repeat_rate", type: "single_choice", section: "Growth", required: true, weight: 1, label: "How often do past customers hear from you again?", options: [o(0.05, "We run proactive re-engagement", 10), o(0.15, "Occasionally, when we have time", 5), o(0.3, "Almost never", 0)] },
    { key: "review_ask", type: "yes_no", section: "Growth", required: true, weight: 1, label: "Do you ask every happy customer for a review or referral?", options: [o("yes", "Yes — every time", 10), o("no", "Not consistently", 0)] },
    { key: "dental_recall", type: "single_choice", section: "Growth", industry: "Dental Practice", required: true, weight: 1, label: "How well does your recall list get worked?", options: [o("automated", "Automated recalls go out on schedule", 10), o("manual", "Someone works the list when there's time", 5), o("none", "We don't actively work recalls", 0)] },
    { key: "legal_consult", type: "single_choice", section: "Customers", industry: "Law Firm", required: true, weight: 1, label: "How many enquiries turn into a booked consultation?", options: [o("most", "Most of them", 10), o("half", "About half", 5), o("few", "Only a few", 0)] },
    { key: "trades_quotes", type: "single_choice", section: "Growth", industry: "Home Services", required: true, weight: 1, label: "What happens to quotes that don't get accepted?", options: [o("chased", "They're chased automatically", 10), o("sometimes", "Sometimes chased", 5), o("never", "They go quiet", 0)] },
  ],
  impact: {
    missed_call_loss: mul(ref("monthly_enquiries"), ref("missed_call_rate"), 0.35, ref("avg_customer_value")),
    slow_response_loss: mul(ref("monthly_enquiries"), ref("response_time"), 0.25, ref("avg_customer_value")),
    lost_followup_loss: mul(ref("monthly_enquiries"), ref("followup"), 0.2, ref("avg_customer_value")),
    no_show_loss: mul(ref("monthly_revenue"), div(ref("no_show_rate"), 100), 0.5),
    admin_waste: mul(ref("manual_hours"), 4.33, ref("hourly_cost")),
    monthly_leak: add(
      mul(ref("monthly_enquiries"), ref("missed_call_rate"), 0.35, ref("avg_customer_value")),
      mul(ref("monthly_enquiries"), ref("response_time"), 0.25, ref("avg_customer_value")),
      mul(ref("monthly_enquiries"), ref("followup"), 0.2, ref("avg_customer_value")),
      mul(ref("monthly_revenue"), div(ref("no_show_rate"), 100), 0.5),
      mul(ref("manual_hours"), 4.33, ref("hourly_cost")),
    ),
    annual_leak: mul(12, add(
      mul(ref("monthly_enquiries"), ref("missed_call_rate"), 0.35, ref("avg_customer_value")),
      mul(ref("monthly_enquiries"), ref("response_time"), 0.25, ref("avg_customer_value")),
      mul(ref("monthly_enquiries"), ref("followup"), 0.2, ref("avg_customer_value")),
      mul(ref("monthly_revenue"), div(ref("no_show_rate"), 100), 0.5),
      mul(ref("manual_hours"), 4.33, ref("hourly_cost")),
    )),
    realistically_recoverable_year_one: mul(0.6, 12, add(
      mul(ref("monthly_enquiries"), ref("missed_call_rate"), 0.35, ref("avg_customer_value")),
      mul(ref("monthly_enquiries"), ref("response_time"), 0.25, ref("avg_customer_value")),
      mul(ref("monthly_enquiries"), ref("followup"), 0.2, ref("avg_customer_value")),
      mul(ref("monthly_revenue"), div(ref("no_show_rate"), 100), 0.5),
      mul(ref("manual_hours"), 4.33, ref("hourly_cost")),
    )),
  },
  recommendations: [
    { title: "Answer every call, including the ones you miss today", body: "An always-on answering layer captures the caller's details, books where it can, and hands the rest to your team with full context. This is normally the fastest single change to revenue.", band: "critical" },
    { title: "Reply to new enquiries in minutes, not hours", body: "An instant first response — by text and email — holds the enquiry while your team gets to it. Speed alone converts more of the leads you already pay for.", band: "at_risk" },
    { title: "Make follow-up automatic", body: "A short, human sequence over two weeks for anyone who doesn't buy immediately. Consistency here recovers revenue you've already earned the right to." },
    { title: "Protect the calendar", body: "Confirmations, reminders and easy rescheduling cut no-shows sharply and quietly refill gaps that would otherwise stay empty." },
    { title: "Take the admin off your team", body: "Scheduling, data entry and chasing payments are the usual candidates. Removing them returns hours every week to work that actually earns." },
    { title: "Turn happy customers into new ones", body: "A systematic review and referral ask after every good outcome compounds into a steady, no-cost lead source.", band: "strong" },
  ],
});

CALCS.push({
  key: "missed-calls",
  slug: "missed-calls",
  name: "Missed Calls Calculator",
  tagline: "Every unanswered call has a price",
  description: "See what unanswered calls, voicemails and after-hours enquiries cost your business each year.",
  outcome: "Capture every inbound opportunity",
  settings: settings({
    liveLabel: "Estimated impact updated",
    thankYouTitle: "Want every call answered?",
    thankYouBody: "We'll show you exactly how call capture works for a business like yours, and what it would recover.",
    landing: {
      eyebrow: "Revenue Recovery Platform",
      headline: "What do the calls you miss actually cost?",
      subheadline: "Two minutes of plain questions about your phones. You'll see how many opportunities never reach you, and what they are worth over a year.",
      primaryCta: "Start free analysis",
    },
    report: {
      scoreLabel: "Call capture score",
      monthlyKey: "monthly_loss", annualKey: "annual_loss",
      monthlyLabel: "Estimated monthly revenue lost to missed calls",
      annualLabel: "Estimated annual revenue lost to missed calls",
      outcomes: ["Every call answered, day or night", "Callers booked instead of chased", "No more voicemail black holes", "A record of every conversation in one place"],
      roadmap: [
        { phase: "Days 1–30", title: "Capture the overflow", body: "Nothing rings out. Every unanswered call is answered, qualified and logged." },
        { phase: "Days 31–60", title: "Book from the call", body: "Turn captured calls into booked work without a callback." },
        { phase: "Days 61–90", title: "Cover after hours", body: "Evenings and weekends handled the same way as your busiest Tuesday." },
      ],
      nextActions: ["Check how many calls rang out last week", "Decide who owns the callback queue", "Set a target: zero unanswered calls in business hours"],
      pdf: { brandName: "Dock", footnote: "Estimates are directional and based on the answers provided plus service-industry benchmarks." },
      ctaPrimary: "Book a strategy call", ctaSecondary: "Download PDF",
    },
  }),
  questions: [
    { key: "monthly_calls", type: "number", section: "Snapshot", required: true, label: "How many inbound calls does the business get in a typical month?", validation: { min: 0 } },
    { key: "avg_customer_value", type: "currency", section: "Snapshot", required: true, label: "What is one new customer typically worth to you?", validation: { min: 0 } },
    { key: "close_rate", type: "percentage", section: "Snapshot", required: true, label: "Of the callers you do speak to, what share become customers?", validation: { min: 0, max: 100 } },
    { key: "missed_pct", type: "single_choice", section: "Phones", required: true, weight: 1, label: "Out of every ten calls, how many go unanswered?", insight: "Missed calls rarely call back — most simply try the next business on the list.", options: [o(0.05, "Almost none", 10), o(0.2, "One or two", 7), o(0.35, "Three or four", 4), o(0.55, "Five or more", 0)] },
    { key: "voicemail", type: "single_choice", section: "Phones", required: true, weight: 1, label: "When a call goes to voicemail, what usually happens?", options: [o("callback_fast", "We call back within the hour", 10), o("callback_slow", "We call back eventually", 5), o("rarely", "Most voicemails go cold", 0)] },
    { key: "after_hours_share", type: "single_choice", section: "Phones", required: true, weight: 1, label: "How much of your call volume arrives outside business hours?", options: [o("low", "Hardly any", 10), o("some", "Around a quarter", 5), o("lots", "A large share — evenings and weekends", 0)] },
    { key: "answer_speed", type: "single_choice", section: "Phones", required: true, weight: 1, label: "How quickly does a ringing phone get picked up?", options: [o("fast", "Within a few rings", 10), o("ok", "Usually, when we're not busy", 5), o("slow", "Often it just rings out", 0)] },
    { key: "text_back", type: "yes_no", section: "Recovery", required: true, weight: 1, label: "Does a missed caller automatically get a text back?", options: [o("yes", "Yes", 10), o("no", "No", 0)] },
    { key: "online_booking", type: "yes_no", section: "Recovery", required: true, weight: 1, label: "Can a customer book with you without speaking to anyone?", options: [o("yes", "Yes", 10), o("no", "No", 0)] },
    { key: "call_logging", type: "single_choice", section: "Recovery", required: true, weight: 1, label: "Where do call details end up?", options: [o("crm", "Straight into one system", 10), o("notes", "Notepads, inbox, someone's memory", 4), o("nowhere", "Nowhere reliable", 0)] },
  ],
  impact: {
    missed_calls_per_month: mul(ref("monthly_calls"), ref("missed_pct")),
    lost_customers_per_month: mul(ref("monthly_calls"), ref("missed_pct"), div(ref("close_rate"), 100), 0.6),
    monthly_loss: mul(ref("monthly_calls"), ref("missed_pct"), div(ref("close_rate"), 100), 0.6, ref("avg_customer_value")),
    annual_loss: mul(12, ref("monthly_calls"), ref("missed_pct"), div(ref("close_rate"), 100), 0.6, ref("avg_customer_value")),
    realistically_recoverable_year_one: mul(0.7, 12, ref("monthly_calls"), ref("missed_pct"), div(ref("close_rate"), 100), 0.6, ref("avg_customer_value")),
  },
  recommendations: [
    { title: "Nothing rings out", body: "An always-on answering layer picks up whatever your team can't, takes the details and books where it can.", band: "critical" },
    { title: "Text back instantly", body: "A missed caller who gets a text within seconds usually stays with you instead of calling the next business.", band: "at_risk" },
    { title: "Let people book without calling", body: "A share of your callers would rather book themselves. Give them the option and free the phone for the rest." },
    { title: "Cover evenings and weekends", body: "After-hours enquiries are often the most urgent — and the most likely to go elsewhere." },
    { title: "Log every call in one place", body: "Consistent records make follow-up possible and stop opportunities disappearing into someone's memory." },
  ],
});

CALCS.push({
  key: "lead-conversion",
  slug: "lead-conversion",
  name: "Lead Conversion Audit",
  tagline: "Understand why prospects never become customers",
  description: "Diagnose where your enquiries drop off and see the revenue sitting inside leads you already have.",
  outcome: "Convert more of the leads you already earn",
  settings: settings({
    liveLabel: "Estimated opportunity updated",
    thankYouTitle: "Want to convert more of what you already get?",
    thankYouBody: "We'll walk through the drop-off points in your funnel and the fastest way to close them.",
    landing: {
      eyebrow: "Revenue Recovery Platform",
      headline: "Your next customers are already in your pipeline.",
      subheadline: "A short audit of how enquiries are handled from first contact to signed work. You'll see where they fall away and what closing those gaps is worth.",
      primaryCta: "Start free audit",
    },
    report: {
      scoreLabel: "Conversion health score",
      monthlyKey: "monthly_opportunity", annualKey: "annual_opportunity",
      monthlyLabel: "Estimated monthly revenue opportunity",
      annualLabel: "Estimated annual revenue opportunity",
      outcomes: ["Faster first response on every enquiry", "A follow-up rhythm nobody has to remember", "Clear visibility of where deals stall", "More closed work from the same lead volume"],
      roadmap: [
        { phase: "Days 1–30", title: "Fix first response", body: "Every enquiry acknowledged immediately with a clear next step." },
        { phase: "Days 31–60", title: "Build the follow-up engine", body: "Multi-touch sequences for every enquiry that hasn't said no." },
        { phase: "Days 61–90", title: "Make the pipeline visible", body: "One view of every open opportunity and what it's waiting on." },
      ],
      nextActions: ["Measure your true first-response time this week", "Write the five follow-up messages you send every time", "Agree what counts as a qualified lead"],
      pdf: { brandName: "Dock", footnote: "Estimates are directional and based on the answers provided plus service-industry benchmarks." },
      ctaPrimary: "Book a strategy call", ctaSecondary: "Download PDF",
    },
  }),
  questions: [
    { key: "monthly_leads", type: "number", section: "Snapshot", required: true, label: "How many leads reach you in a typical month?", validation: { min: 0 } },
    { key: "avg_customer_value", type: "currency", section: "Snapshot", required: true, label: "What is a closed customer worth to you on average?", validation: { min: 0 } },
    { key: "close_rate", type: "percentage", section: "Snapshot", required: true, label: "What share of those leads become paying customers?", validation: { min: 0, max: 100 } },
    { key: "response_time", type: "single_choice", section: "First contact", required: true, weight: 1, label: "How fast does a new lead hear back from you?", insight: "Speed of first response is consistently the strongest predictor of whether a lead converts.", options: [o("minutes", "Within minutes", 10), o("hour", "Within an hour", 7), o("day", "Same day", 4), o("later", "Next day or later", 0)] },
    { key: "qualification", type: "yes_no", section: "First contact", required: true, weight: 1, label: "Do you qualify leads before spending time on them?", options: [o("yes", "Yes — there's a clear standard", 10), o("no", "Not really", 0)] },
    { key: "followup_touches", type: "single_choice", section: "Follow-up", required: true, weight: 1, label: "How many times do you follow up before giving up?", insight: "Most conversions happen after the third contact — long after most businesses have stopped.", options: [o("five", "Five or more", 10), o("three", "Two or three", 6), o("one", "Once", 2), o("none", "We don't follow up", 0)] },
    { key: "nurture", type: "yes_no", section: "Follow-up", required: true, weight: 1, label: "Do leads that say 'not right now' stay in touch with you?", options: [o("yes", "Yes — they're nurtured", 10), o("no", "No — they go cold", 0)] },
    { key: "proposal_followup", type: "single_choice", section: "Follow-up", required: true, weight: 1, label: "What happens after you send a quote or proposal?", options: [o("automatic", "It's chased automatically until answered", 10), o("manual", "Someone chases when they remember", 5), o("nothing", "We wait to hear back", 0)] },
    { key: "crm", type: "single_choice", section: "Visibility", required: true, weight: 1, label: "Where do your leads live?", options: [o("crm", "One system everyone uses", 10), o("mixed", "A mix of inbox, sheets and notes", 4), o("none", "No single place", 0)] },
    { key: "tracking", type: "single_choice", section: "Visibility", required: true, weight: 1, label: "Do you know which sources produce your best customers?", options: [o("yes", "Yes — we track it", 10), o("rough", "Roughly", 5), o("no", "No", 0)] },
  ],
  impact: {
    customers_today_per_month: mul(ref("monthly_leads"), div(ref("close_rate"), 100)),
    achievable_customers_per_month: mul(ref("monthly_leads"), min(mul(div(ref("close_rate"), 100), 1.6), 0.6)),
    additional_customers_per_month: sub(mul(ref("monthly_leads"), min(mul(div(ref("close_rate"), 100), 1.6), 0.6)), mul(ref("monthly_leads"), div(ref("close_rate"), 100))),
    monthly_opportunity: mul(ref("avg_customer_value"), sub(mul(ref("monthly_leads"), min(mul(div(ref("close_rate"), 100), 1.6), 0.6)), mul(ref("monthly_leads"), div(ref("close_rate"), 100)))),
    annual_opportunity: mul(12, ref("avg_customer_value"), sub(mul(ref("monthly_leads"), min(mul(div(ref("close_rate"), 100), 1.6), 0.6)), mul(ref("monthly_leads"), div(ref("close_rate"), 100)))),
  },
  recommendations: [
    { title: "Respond first, qualify second", body: "An immediate acknowledgement holds the lead while your team prepares a proper reply.", band: "critical" },
    { title: "Five touches, every time", body: "A defined follow-up sequence removes the guesswork and recovers deals that simply went quiet.", band: "at_risk" },
    { title: "Chase every proposal", body: "Automatic, polite reminders after a quote consistently lift acceptance without any extra effort." },
    { title: "Keep 'not right now' warm", body: "A light monthly touch means you're the obvious call when timing changes." },
    { title: "One pipeline, one truth", body: "When every lead lives in one place, nothing falls between people or inboxes." },
  ],
});

CALCS.push({
  key: "time-waste",
  slug: "time-waste",
  name: "Time Waste Calculator",
  tagline: "Turn wasted hours into recovered profit",
  description: "Translate repetitive manual work into the exact hours and dollars it costs you every month.",
  outcome: "Reclaim hours across your team",
  settings: settings({
    liveLabel: "Estimated recoverable time updated",
    thankYouTitle: "Want those hours back?",
    thankYouBody: "We'll map which tasks can come off your team first and what that frees up.",
    landing: {
      eyebrow: "Revenue Recovery Platform",
      headline: "How many hours a week does your business lose to work nobody should be doing?",
      subheadline: "A quick look at the repetitive tasks running your team's day. You'll see the hours and the real cost, and how much of it can be handed to a system.",
      primaryCta: "Start free analysis",
    },
    report: {
      scoreLabel: "Operational efficiency score",
      monthlyKey: "monthly_recoverable_cost", annualKey: "annual_recoverable_cost",
      monthlyLabel: "Estimated monthly cost of recoverable admin",
      annualLabel: "Estimated annual cost of recoverable admin",
      outcomes: ["Hours returned to billable or customer-facing work", "Fewer things typed twice", "Fewer things forgotten", "A calmer, more predictable week"],
      roadmap: [
        { phase: "Days 1–30", title: "Remove the worst task", body: "Pick the single most repetitive job and take it off people entirely." },
        { phase: "Days 31–60", title: "Connect the tools", body: "Stop the double entry between the systems you already pay for." },
        { phase: "Days 61–90", title: "Automate the routine", body: "Reminders, reporting and follow-ups run themselves." },
      ],
      nextActions: ["List the five tasks your team repeats most", "Time one of them honestly for a week", "Pick one to remove this month"],
      pdf: { brandName: "Dock", footnote: "Estimates are directional and based on the answers provided plus service-industry benchmarks." },
      ctaPrimary: "Book a strategy call", ctaSecondary: "Download PDF",
    },
  }),
  questions: [
    { key: "team_size", type: "number", section: "Snapshot", required: true, label: "How many people work in the business?", validation: { min: 1 } },
    { key: "admin_hours_per_person", type: "number", section: "Snapshot", required: true, label: "On average, how many hours a week does each person spend on admin?", help: "Anything that isn't serving a customer or winning work.", validation: { min: 0, max: 60 } },
    { key: "hourly_cost", type: "currency", section: "Snapshot", required: true, label: "What does an hour of that time cost you?", validation: { min: 0 } },
    { key: "tasks", type: "multi_choice", section: "Where it goes", required: true, weight: 1, label: "Which of these eat the most time?", options: [o("scheduling", "Booking and rescheduling", 0), o("data_entry", "Typing the same details twice", 0), o("invoicing", "Invoicing and chasing payment", 0), o("followups", "Chasing customers for replies", 0), o("reporting", "Pulling numbers together", 0), o("reminders", "Sending reminders", 0)] },
    { key: "duplicate_entry", type: "single_choice", section: "Where it goes", required: true, weight: 1, label: "How often does the same information get entered more than once?", options: [o("never", "Almost never", 10), o("sometimes", "A few times a day", 5), o("constantly", "Constantly", 0)] },
    { key: "tools_connected", type: "single_choice", section: "Where it goes", required: true, weight: 1, label: "Do your tools talk to each other?", options: [o("yes", "Yes — one connected system", 10), o("partly", "Partly", 5), o("no", "Not at all", 0)] },
    { key: "reporting_hours", type: "number", section: "Where it goes", required: true, label: "How many hours a month go into putting reports together?", validation: { min: 0 } },
    { key: "interruptions", type: "single_choice", section: "Impact", required: true, weight: 1, label: "How often does admin interrupt customer-facing work?", options: [o("rare", "Rarely", 10), o("daily", "Daily", 5), o("constant", "All day", 0)] },
    { key: "automation_now", type: "single_choice", section: "Impact", required: true, weight: 1, label: "How much of your routine work already runs automatically?", options: [o("most", "Most of it", 10), o("some", "Some of it", 5), o("none", "None of it", 0)] },
    { key: "capacity", type: "yes_no", section: "Impact", required: true, weight: 1, label: "Could your team take on more work if the admin disappeared?", options: [o("yes", "Yes — we'd have real capacity", 10), o("no", "No", 3)] },
  ],
  impact: {
    weekly_hours_lost: mul(ref("team_size"), ref("admin_hours_per_person")),
    monthly_hours_lost: mul(ref("team_size"), ref("admin_hours_per_person"), 4.33),
    monthly_admin_cost: mul(ref("team_size"), ref("admin_hours_per_person"), 4.33, ref("hourly_cost")),
    monthly_recoverable_hours: add(mul(ref("team_size"), ref("admin_hours_per_person"), 4.33, 0.4), mul(ref("reporting_hours"), 0.6)),
    monthly_recoverable_cost: mul(ref("hourly_cost"), add(mul(ref("team_size"), ref("admin_hours_per_person"), 4.33, 0.4), mul(ref("reporting_hours"), 0.6))),
    annual_recoverable_cost: mul(12, ref("hourly_cost"), add(mul(ref("team_size"), ref("admin_hours_per_person"), 4.33, 0.4), mul(ref("reporting_hours"), 0.6))),
  },
  recommendations: [
    { title: "Take the worst task off people entirely", body: "One repetitive job, removed properly, usually returns more time than a dozen small process tweaks.", band: "critical" },
    { title: "Stop the double entry", body: "Connecting the systems you already pay for removes an entire category of work and a whole class of mistakes.", band: "at_risk" },
    { title: "Automate reminders and confirmations", body: "Quiet, reliable messages that go out without anyone thinking about them." },
    { title: "Let reporting build itself", body: "Numbers that assemble themselves are more accurate and cost nothing to produce." },
    { title: "Protect customer-facing time", body: "Fewer interruptions means better work and more of it." },
  ],
});

CALCS.push({
  key: "roi",
  slug: "ai-roi",
  name: "AI ROI Calculator",
  tagline: "Model the true return before you commit",
  description: "Project the financial return of intelligent systems across revenue, cost and time — using your own numbers.",
  outcome: "Make investment decisions with confidence",
  settings: settings({
    liveLabel: "Projected return updated",
    thankYouTitle: "Want to see how this plays out for you?",
    thankYouBody: "We'll pressure-test these numbers together and show what the first ninety days would look like.",
    landing: {
      eyebrow: "Revenue Recovery Platform",
      headline: "What would intelligent systems actually return?",
      subheadline: "No jargon and no hype. Answer a few questions about your business and see the projected return across new revenue, saved cost and recovered time.",
      primaryCta: "Model my return",
    },
    report: {
      scoreLabel: "Readiness score",
      monthlyKey: "total_monthly_gain", annualKey: "annual_gain",
      monthlyLabel: "Projected monthly gain",
      annualLabel: "Projected annual gain",
      outcomes: ["A clear, costed business case", "Priority order for what to build first", "Realistic payback timeline", "Numbers your team can defend"],
      roadmap: [
        { phase: "Days 1–30", title: "Prove one use case", body: "Start where the return is fastest and the risk is lowest." },
        { phase: "Days 31–60", title: "Measure honestly", body: "Track the before and after so the business case stands on evidence." },
        { phase: "Days 61–90", title: "Extend what worked", body: "Roll the proven pattern into the next process." },
      ],
      nextActions: ["Agree the single metric this must move", "Confirm who owns the rollout internally", "Set a review date ninety days out"],
      pdf: { brandName: "Dock", footnote: "Projections are directional and based on the answers provided plus service-industry benchmarks." },
      ctaPrimary: "Book a strategy call", ctaSecondary: "Download PDF",
    },
  }),
  questions: [
    { key: "monthly_revenue", type: "currency", section: "Snapshot", required: true, label: "Roughly what does the business bring in each month?", validation: { min: 0 } },
    { key: "monthly_enquiries", type: "number", section: "Snapshot", required: true, label: "How many new enquiries arrive in a typical month?", validation: { min: 0 } },
    { key: "avg_customer_value", type: "currency", section: "Snapshot", required: true, label: "What is one new customer worth to you?", validation: { min: 0 } },
    { key: "missed_opportunity_rate", type: "single_choice", section: "Opportunity", required: true, weight: 1, label: "What share of enquiries do you feel you never properly capture?", options: [o(0.05, "Very few — we're on top of it", 10), o(0.15, "Around one in six", 6), o(0.3, "Close to a third", 2), o(0.45, "Honestly, a lot", 0)] },
    { key: "admin_hours", type: "number", section: "Opportunity", required: true, label: "How many hours a week does the team spend on repetitive admin?", validation: { min: 0 } },
    { key: "hourly_cost", type: "currency", section: "Opportunity", required: true, label: "What does an hour of that time cost you?", validation: { min: 0 } },
    { key: "goal", type: "single_choice", section: "Intent", required: true, weight: 1, label: "What would make the biggest difference right now?", options: [o("leads", "More enquiries turning into customers", 8), o("admin", "Less admin on the team", 8), o("speed", "Faster response to customers", 10), o("retention", "Keeping customers longer", 8)] },
    { key: "data_ready", type: "single_choice", section: "Readiness", required: true, weight: 1, label: "How organised is your customer information?", options: [o("clean", "One system, well kept", 10), o("messy", "Spread across a few places", 5), o("chaos", "Wherever it landed", 0)] },
    { key: "owner", type: "yes_no", section: "Readiness", required: true, weight: 1, label: "Is there someone internally who would own this?", options: [o("yes", "Yes", 10), o("no", "Not yet", 3)] },
    { key: "timeline", type: "single_choice", section: "Readiness", required: true, weight: 1, label: "When would you want this working?", options: [o("now", "As soon as possible", 10), o("quarter", "This quarter", 7), o("later", "Sometime this year", 3), o("exploring", "Just exploring", 0)] },
    { key: "planned_investment", type: "currency", section: "Readiness", required: true, label: "What monthly budget would you consider for this?", help: "A rough figure is fine — it only shapes the payback maths.", validation: { min: 0 } },
  ],
  impact: {
    new_revenue_monthly: mul(ref("monthly_enquiries"), ref("missed_opportunity_rate"), 0.35, ref("avg_customer_value")),
    cost_saved_monthly: mul(ref("admin_hours"), 4.33, ref("hourly_cost"), 0.4),
    total_monthly_gain: add(mul(ref("monthly_enquiries"), ref("missed_opportunity_rate"), 0.35, ref("avg_customer_value")), mul(ref("admin_hours"), 4.33, ref("hourly_cost"), 0.4)),
    annual_gain: mul(12, add(mul(ref("monthly_enquiries"), ref("missed_opportunity_rate"), 0.35, ref("avg_customer_value")), mul(ref("admin_hours"), 4.33, ref("hourly_cost"), 0.4))),
    annual_investment: mul(12, ref("planned_investment")),
    net_annual_return: sub(mul(12, add(mul(ref("monthly_enquiries"), ref("missed_opportunity_rate"), 0.35, ref("avg_customer_value")), mul(ref("admin_hours"), 4.33, ref("hourly_cost"), 0.4))), mul(12, ref("planned_investment"))),
    payback_months: div(ref("planned_investment"), add(mul(ref("monthly_enquiries"), ref("missed_opportunity_rate"), 0.35, ref("avg_customer_value")), mul(ref("admin_hours"), 4.33, ref("hourly_cost"), 0.4))),
  },
  recommendations: [
    { title: "Start with response speed", body: "Answering faster is the lowest-risk, fastest-return change in almost every service business.", band: "critical" },
    { title: "Automate the highest-volume admin", body: "Volume beats complexity. The boring, frequent task usually pays back first.", band: "at_risk" },
    { title: "Tidy the data first", body: "Clean customer records make everything downstream cheaper and more accurate." },
    { title: "Name an internal owner", body: "Projects with a clear owner land. Projects without one drift." },
    { title: "Measure before and after", body: "Agree the number this must move, capture the baseline, and review at ninety days." },
  ],
});

// ---------- SQL generation ----------
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const j = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

const BANDS = (max) => [
  { key: "critical", label: "Critical", min: 0, max: Math.round(max * 0.4), copy: "There are significant gaps here. The good news is that the biggest ones are usually the easiest to close, and the impact shows up quickly." },
  { key: "at_risk", label: "At risk", min: Math.round(max * 0.4) + 1, max: Math.round(max * 0.6), copy: "The fundamentals are in place, but enough is slipping through that it is costing you real money every month." },
  { key: "stable", label: "Stable", min: Math.round(max * 0.6) + 1, max: Math.round(max * 0.8), copy: "You run a tidy operation. What remains is refinement — a handful of gaps that quietly cap your growth." },
  { key: "strong", label: "Strong", min: Math.round(max * 0.8) + 1, max: max, copy: "You are ahead of most businesses in your field. The opportunity now is compounding what already works." },
];

let sql = ["begin;"];

// remove retired calculators
sql.push(`delete from rr_calculators where key = any(array[${DROP.map(q).join(",")}]) or key like '%-copy-%';`);

for (const c of CALCS) {
  const scored = c.questions.filter((x) => x.weight);
  const maxScore = scored.reduce((s, x) => s + Math.max(...(x.options ?? [{ score: 0 }]).map((op) => op.score ?? 0), 0), 0) || 100;
  const scoring = {
    method: "weighted_sum",
    scale: { min: 0, max: maxScore },
    bands: BANDS(maxScore),
    financialImpact: c.impact,
  };
  sql.push(`
insert into rr_calculators (key, slug, name, tagline, description, outcome, industries, settings, status)
values (${q(c.key)}, ${q(c.slug)}, ${q(c.name)}, ${q(c.tagline)}, ${q(c.description)}, ${q(c.outcome)},
        ${`array[${INDUSTRIES.map(q).join(",")}]::text[]`}, ${j(c.settings)}, 'draft')
on conflict (key) do update set slug = excluded.slug, name = excluded.name, tagline = excluded.tagline,
  description = excluded.description, outcome = excluded.outcome, industries = excluded.industries,
  settings = excluded.settings;`);

  sql.push(`delete from rr_questions where calculator_id = (select id from rr_calculators where key = ${q(c.key)});`);
  c.questions.forEach((x, i) => {
    sql.push(`insert into rr_questions (calculator_id, order_index, section, industry, type, key, label, help, tooltip, insight, required, options, validation, conditions, weight, scoring)
values ((select id from rr_calculators where key = ${q(c.key)}), ${i}, ${q(x.section ?? null)}, ${q(x.industry ?? null)}, ${q(x.type)}, ${q(x.key)}, ${q(x.label)}, ${q(x.help ?? "")}, ${q(x.tooltip ?? "")}, ${q(x.insight ?? "")}, ${x.required ? "true" : "false"}, ${j(x.options ?? [])}, ${j(x.validation ?? {})}, ${j(x.conditions ?? [])}, ${x.weight ?? 0}, '{}'::jsonb);`);
  });

  sql.push(`delete from rr_scoring_rules where calculator_id = (select id from rr_calculators where key = ${q(c.key)});`);
  sql.push(`insert into rr_scoring_rules (calculator_id, industry, config) values ((select id from rr_calculators where key = ${q(c.key)}), null, ${j(scoring)});`);

  sql.push(`delete from rr_recommendations where calculator_id = (select id from rr_calculators where key = ${q(c.key)});`);
  c.recommendations.forEach((r, i) => {
    sql.push(`insert into rr_recommendations (calculator_id, order_index, industry, title, body, triggers, cta)
values ((select id from rr_calculators where key = ${q(c.key)}), ${i}, null, ${q(r.title)}, ${q(r.body)}, ${j(r.band ? { band: r.band } : {})}, '{}'::jsonb);`);
  });

  // publish: snapshot current content as a new version
  sql.push(`
with c as (select * from rr_calculators where key = ${q(c.key)}),
 nv as (select coalesce(max(version),0)+1 v from rr_calculator_versions where calculator_id = (select id from c)),
 ins as (
   insert into rr_calculator_versions (calculator_id, version, snapshot, is_published)
   select c.id, nv.v, jsonb_build_object(
     'calculator', to_jsonb(c),
     'questions', coalesce((select jsonb_agg(to_jsonb(q) order by q.order_index) from rr_questions q where q.calculator_id = c.id), '[]'::jsonb),
     'scoring', coalesce((select jsonb_agg(to_jsonb(s)) from rr_scoring_rules s where s.calculator_id = c.id), '[]'::jsonb),
     'recommendations', coalesce((select jsonb_agg(to_jsonb(r) order by r.order_index) from rr_recommendations r where r.calculator_id = c.id), '[]'::jsonb)
   ), true from c, nv returning calculator_id, version
 )
update rr_calculators set status = 'published', published_version = ins.version, published_at = now()
from ins where rr_calculators.id = ins.calculator_id;`);
  sql.push(`update rr_calculator_versions v set is_published = (v.version = (select published_version from rr_calculators c where c.id = v.calculator_id)) where v.calculator_id = (select id from rr_calculators where key = ${q(c.key)});`);
}

sql.push("commit;");
writeFileSync("/tmp/seed-rr.sql", sql.join("\n"));
console.log("written", sql.length, "statements");
