/**
 * Conditional-logic engine. Decides which questions are visible given the
 * current answers and the chosen industry, and evaluates trigger conditions for
 * recommendations. Deterministic and side-effect free.
 */
import type {
  Answers,
  Condition,
  ConditionGroup,
  Conditions,
  EngineQuestion,
  JsonValue,
} from "./types";

const ALL = "All Industries";

function asArray(v: JsonValue | undefined): JsonValue[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function toNum(v: JsonValue | undefined): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Resolve a single condition against a value lookup (answers or signals). */
export function evalCondition(
  rule: Condition,
  read: (key: string) => JsonValue | undefined,
): boolean {
  const actual = read(rule.when);
  switch (rule.op) {
    case "answered":
      return actual != null && actual !== "" && !(Array.isArray(actual) && actual.length === 0);
    case "eq":
      return actual === rule.value;
    case "neq":
      return actual !== rule.value;
    case "in":
      return asArray(rule.value).some((x) => asArray(actual).includes(x));
    case "nin":
      return !asArray(rule.value).some((x) => asArray(actual).includes(x));
    case "contains":
      return asArray(actual).includes(rule.value as JsonValue);
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = toNum(actual);
      const b = toNum(rule.value);
      if (a == null || b == null) return false;
      if (rule.op === "gt") return a > b;
      if (rule.op === "gte") return a >= b;
      if (rule.op === "lt") return a < b;
      return a <= b;
    }
    default:
      return false;
  }
}

function isGroup(c: Conditions): c is ConditionGroup {
  return !Array.isArray(c) && typeof c === "object" && Array.isArray((c as ConditionGroup).rules);
}

/** Evaluate a set of conditions (bare array = all-of) against a value lookup. */
export function evalConditions(
  conditions: Conditions | undefined,
  read: (key: string) => JsonValue | undefined,
): boolean {
  if (!conditions) return true;
  if (isGroup(conditions)) {
    if (!conditions.rules.length) return true;
    return conditions.match === "any"
      ? conditions.rules.some((r) => evalCondition(r, read))
      : conditions.rules.every((r) => evalCondition(r, read));
  }
  if (!conditions.length) return true;
  return conditions.every((r) => evalCondition(r, read));
}

/**
 * Whether a question should be shown, given the answers and selected industry.
 * A question is hidden if its industry targeting excludes the current industry
 * or any of its show-if conditions fail.
 */
export function isVisible(q: EngineQuestion, answers: Answers, industry: string | null): boolean {
  const target = (q.industry ?? "").trim();
  if (target && target !== ALL && industry && industry !== ALL && target !== industry) {
    return false;
  }
  return evalConditions(q.conditions, (key) => answers[key]);
}

/** The ordered list of questions currently visible. */
export function visibleQuestions(
  questions: EngineQuestion[],
  answers: Answers,
  industry: string | null,
): EngineQuestion[] {
  return questions.filter((q) => isVisible(q, answers, industry));
}
