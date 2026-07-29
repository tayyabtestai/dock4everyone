import type { Answers, Question } from "./types";

export type ValidationError = { key: string; message: string };

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function validateAnswer(q: Question, value: unknown): ValidationError | null {
  if (q.required && isEmpty(value)) return { key: q.key, message: "Required" };
  if (isEmpty(value)) return null;
  const v = q.validation ?? {};

  switch (q.type) {
    case "number":
    case "currency":
    case "percentage":
    case "slider":
    case "rating": {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n)) return { key: q.key, message: "Must be a number" };
      if (v.min != null && n < v.min) return { key: q.key, message: `Minimum ${v.min}` };
      if (v.max != null && n > v.max) return { key: q.key, message: `Maximum ${v.max}` };
      break;
    }
    case "short_text":
    case "long_text": {
      const s = String(value);
      if (v.minLength != null && s.length < v.minLength) return { key: q.key, message: `Min ${v.minLength} chars` };
      if (v.maxLength != null && s.length > v.maxLength) return { key: q.key, message: `Max ${v.maxLength} chars` };
      if (v.pattern && !new RegExp(v.pattern).test(s)) return { key: q.key, message: "Invalid format" };
      break;
    }
    case "single_choice":
    case "yes_no": {
      const allowed = (q.options ?? []).map((o) => o.value);
      if (q.type === "yes_no" && !allowed.length) {
        if (value !== "yes" && value !== "no" && value !== true && value !== false) {
          return { key: q.key, message: "Choose yes or no" };
        }
      } else if (!allowed.includes(String(value))) {
        return { key: q.key, message: "Invalid choice" };
      }
      break;
    }
    case "multi_choice": {
      if (!Array.isArray(value)) return { key: q.key, message: "Invalid choices" };
      const allowed = new Set((q.options ?? []).map((o) => o.value));
      for (const item of value) if (!allowed.has(String(item))) return { key: q.key, message: "Invalid choice" };
      break;
    }
  }
  return null;
}

export function validateAll(questions: Question[], answers: Answers): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const q of questions) {
    const err = validateAnswer(q, answers[q.key]);
    if (err) errors.push(err);
  }
  return errors;
}