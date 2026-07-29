import type { Condition, Formula } from "./types";

export type EvalContext = {
  answers: Record<string, unknown>;
  score?: number;
  industry?: string | null;
  [k: string]: unknown;
};

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  return fallback;
}

function getPath(ctx: EvalContext, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = ctx;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function evalCondition(cond: Condition | undefined, ctx: EvalContext): boolean {
  if (!cond) return true;
  if ("all" in cond) return cond.all.every((c) => evalCondition(c, ctx));
  if ("any" in cond) return cond.any.some((c) => evalCondition(c, ctx));
  if ("not" in cond) return !evalCondition(cond.not, ctx);

  const lhs = getPath(ctx, cond.ref);
  const rhs = cond.value;
  switch (cond.op) {
    case "eq": return lhs === rhs;
    case "neq": return lhs !== rhs;
    case "gt": return toNumber(lhs) > toNumber(rhs);
    case "gte": return toNumber(lhs) >= toNumber(rhs);
    case "lt": return toNumber(lhs) < toNumber(rhs);
    case "lte": return toNumber(lhs) <= toNumber(rhs);
    case "in": return Array.isArray(rhs) && rhs.includes(lhs as never);
    case "nin": return Array.isArray(rhs) && !rhs.includes(lhs as never);
    case "truthy": return Boolean(lhs);
    case "falsy": return !lhs;
    default: return false;
  }
}

export function evalFormula(f: Formula | undefined, ctx: EvalContext): number {
  if (f == null) return 0;
  if (typeof f === "number") return f;
  if (typeof f === "object" && "const" in f) return toNumber(f.const);
  if (typeof f === "object" && "ref" in f) return toNumber(getPath(ctx, f.ref));
  if (typeof f === "object" && "op" in f) {
    switch (f.op) {
      case "add": return f.args.reduce<number>((a, b) => a + evalFormula(b, ctx), 0);
      case "sub": {
        const [head, ...rest] = f.args;
        return rest.reduce<number>((a, b) => a - evalFormula(b, ctx), evalFormula(head, ctx));
      }
      case "mul": return f.args.reduce<number>((a, b) => a * evalFormula(b, ctx), 1);
      case "div": {
        const [head, ...rest] = f.args;
        return rest.reduce<number>((a, b) => {
          const d = evalFormula(b, ctx);
          return d === 0 ? 0 : a / d;
        }, evalFormula(head, ctx));
      }
      case "min": return Math.min(...f.args.map((a) => evalFormula(a, ctx)));
      case "max": return Math.max(...f.args.map((a) => evalFormula(a, ctx)));
      case "pct": {
        const [a, b] = f.args;
        return (evalFormula(a, ctx) * evalFormula(b, ctx)) / 100;
      }
      case "if": return evalCondition(f.cond, ctx) ? evalFormula(f.then, ctx) : evalFormula(f.else, ctx);
      case "coalesce": {
        for (const arg of f.args) {
          const v = evalFormula(arg, ctx);
          if (v) return v;
        }
        return 0;
      }
      case "sum": {
        const list = getPath(ctx, f.over);
        if (!Array.isArray(list)) return 0;
        return list.reduce((acc: number, item) => {
          const nested: EvalContext = { ...ctx, [f.as]: item };
          return acc + evalFormula(f.expr, nested);
        }, 0);
      }
    }
  }
  return 0;
}