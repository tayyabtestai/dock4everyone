/**
 * Tiny, safe arithmetic expression evaluator for the calculation engine.
 *
 * Supports numbers, identifiers (resolved from a scope), the operators
 * + - * / and parentheses, unary minus, and the functions min/max/round.
 * It is a hand-written recursive-descent parser — NOT `eval`/`new Function` —
 * so untrusted formula strings can never execute arbitrary code. Unknown
 * identifiers resolve to 0.
 */

type Scope = Record<string, number>;

type Tok =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "(" }
  | { t: ")" }
  | { t: "," };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c >= "0" && c <= "9") {
      let j = i + 1;
      while (j < src.length && /[0-9._]/.test(src[j]!)) j++;
      toks.push({ t: "num", v: Number(src.slice(i, j).replace(/_/g, "")) });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j]!)) j++;
      toks.push({ t: "id", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/".includes(c)) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") {
      toks.push({ t: "(" });
      i++;
      continue;
    }
    if (c === ")") {
      toks.push({ t: ")" });
      i++;
      continue;
    }
    if (c === ",") {
      toks.push({ t: "," });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${c}" in formula`);
  }
  return toks;
}

const FUNCS: Record<string, (args: number[]) => number> = {
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  round: (a) => Math.round(a[0] ?? 0),
  floor: (a) => Math.floor(a[0] ?? 0),
  ceil: (a) => Math.ceil(a[0] ?? 0),
  abs: (a) => Math.abs(a[0] ?? 0),
};

/** Evaluate `formula` against `scope`. Returns 0 for empty/invalid-but-parseable inputs. */
export function evalExpr(formula: string, scope: Scope): number {
  const toks = tokenize(formula);
  let pos = 0;

  const peek = () => toks[pos];
  const next = () => toks[pos++];
  const opAhead = (...ops: string[]) => {
    const tk = peek();
    return tk?.t === "op" && ops.includes(tk.v);
  };

  function parseExpr(): number {
    let left = parseTerm();
    while (opAhead("+", "-")) {
      const op = (next() as { t: "op"; v: string }).v;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (opAhead("*", "/")) {
      const op = (next() as { t: "op"; v: string }).v;
      const right = parseFactor();
      left = op === "*" ? left * right : right === 0 ? 0 : left / right;
    }
    return left;
  }

  function parseFactor(): number {
    const tk = peek();
    if (!tk) return 0;
    if (tk.t === "op" && tk.v === "-") {
      next();
      return -parseFactor();
    }
    if (tk.t === "op" && tk.v === "+") {
      next();
      return parseFactor();
    }
    if (tk.t === "num") {
      next();
      return tk.v;
    }
    if (tk.t === "(") {
      next();
      const v = parseExpr();
      if (peek()?.t === ")") next();
      return v;
    }
    if (tk.t === "id") {
      next();
      // Function call?
      if (peek()?.t === "(") {
        next();
        const args: number[] = [];
        if (peek()?.t !== ")") {
          args.push(parseExpr());
          while (peek()?.t === ",") {
            next();
            args.push(parseExpr());
          }
        }
        if (peek()?.t === ")") next();
        const fn = FUNCS[tk.v];
        return fn ? fn(args) : 0;
      }
      const v = scope[tk.v];
      return typeof v === "number" && Number.isFinite(v) ? v : 0;
    }
    // Unexpected token — consume and yield 0 to stay total.
    next();
    return 0;
  }

  const result = parseExpr();
  return Number.isFinite(result) ? result : 0;
}
