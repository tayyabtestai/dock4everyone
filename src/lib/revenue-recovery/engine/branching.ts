import type { Answers, Question } from "./types";
import { evalCondition } from "./evaluator";

export function visibleQuestions(questions: Question[], answers: Answers, industry?: string | null): Question[] {
  const byKey = new Map<string, Question>();
  for (const q of questions) {
    if (q.industry && industry && q.industry !== industry) continue;
    if (q.industry && !industry) continue;
    const existing = byKey.get(q.key);
    if (!existing) { byKey.set(q.key, q); continue; }
    if (q.industry && !existing.industry) byKey.set(q.key, q);
  }
  const list = [...byKey.values()].sort((a, b) => a.orderIndex - b.orderIndex);
  const ctx = { answers: answers as Record<string, unknown>, industry: industry ?? null };
  return list.filter((q) => {
    if (!q.conditions || q.conditions.length === 0) return true;
    return q.conditions.every((c) => evalCondition(c, ctx));
  });
}