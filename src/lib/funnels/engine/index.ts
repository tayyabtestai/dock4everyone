/**
 * Funnel Engine — public surface.
 *
 * One reusable engine executes every funnel: conditional question flow →
 * scoring → calculation → recommendations → personalised result. Funnels differ
 * only by data (rr_* rows / version snapshot), never by code.
 */
export * from "./types";
export { evalCondition, evalConditions, isVisible, visibleQuestions } from "./conditions";
export { evalExpr } from "./expr";
export {
  bandForScore,
  configForIndustry,
  maxQuestionPoints,
  questionPoints,
  scoreFunnel,
} from "./scoring";
export { formatOutput, runCalculations } from "./calc";
export { selectRecommendations, type Signals } from "./recommendations";
export { buildResult } from "./result";
