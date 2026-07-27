export type QuestionType =
  | "short_text" | "long_text" | "number" | "currency" | "percentage"
  | "dropdown" | "radio" | "checkbox" | "multiple_choice" | "yes_no"
  | "email" | "phone" | "company" | "website" | "date" | "slider"
  | "file_upload" | "rating";

export interface QuestionOption { value: string; label: string }

export interface QuestionCondition {
  ifQuestionId: string;
  op: "equals" | "not_equals" | "gt" | "lt" | "contains";
  value: string | number | boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  default?: unknown;
  helpText?: string;
  errorMessage?: string;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  step?: number;
  conditional?: QuestionCondition;
  section?: string;
}

export type FormulaOp =
  | "add" | "sub" | "mul" | "div" | "pct" | "round" | "min" | "max" | "avg";

export type FormulaArg =
  | { kind: "const"; value: number }
  | { kind: "var"; ref: string }
  | { kind: "prev" };

export interface FormulaStep { op: FormulaOp; args: FormulaArg[] }

export type NumberFormat = "number" | "currency" | "percent";

export interface Formula {
  id: string;
  label: string;
  format?: NumberFormat;
  steps: FormulaStep[];
}

export interface ResultConfig {
  headline?: string;
  valueVar?: string;
  summary?: string;
  sections?: { title: string; body: string }[];
  primary_cta_label?: string;
  primary_cta_url?: string;
  secondary_cta_label?: string;
  secondary_cta_url?: string;
  success_message?: string;
}

export interface RecommendationRule {
  id: string;
  when: { var: string; op: ">" | ">=" | "<" | "<=" | "==" | "!="; value: number };
  title: string;
  body: string;
  priority: "high" | "medium" | "low";
}

export interface LeadFields {
  name?: boolean;
  email?: boolean;
  phone?: boolean;
  company?: boolean;
  industry?: boolean;
  job_title?: boolean;
  team_size?: boolean;
  country?: boolean;
  consent?: boolean;
  consent_text?: string;
  privacy_notice?: string;
}

export type AnswerMap = Record<string, unknown>;
export type ComputedMap = Record<string, number>;