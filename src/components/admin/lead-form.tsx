import { useState } from "react";
import { INDUSTRIES, SOURCES, PLATFORMS, STATUSES, STATUS_LABEL } from "@/lib/leads/taxonomy";
import { LEAD_FIELDS, GROUP_LABEL, type FieldDef, type FieldGroup } from "@/lib/leads/fields";
import type { LeadWrite } from "@/lib/leads/schemas";

export type LeadFormValue = LeadWrite & { tags: string[] };

export const EMPTY_LEAD: LeadFormValue = {
  first_name: "",
  last_name: "",
  full_name: "",
  email: "",
  phone: "",
  business_name: "",
  industry: "",
  website: "",
  source: "",
  platform: "",
  status: "new",
  tags: [],
  notes: "",
  job_title: "",
  location: "",
  country: "",
  funnel_name: "",
};

const GROUP_ORDER: FieldGroup[] = ["contact", "company", "location", "source", "management"];

/** Fields that render as a dropdown, with their option lists. */
const SELECTS: Record<string, { options: readonly string[]; labels?: Record<string, string> }> = {
  industry: { options: INDUSTRIES },
  source: { options: SOURCES },
  platform: { options: PLATFORMS },
  status: { options: STATUSES, labels: STATUS_LABEL },
};

// Rendered with their own dedicated controls, not in the generic grid.
const SPECIAL = new Set(["tags", "notes"]);

export function LeadForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  value: LeadFormValue;
  onChange: (v: LeadFormValue) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [tagDraft, setTagDraft] = useState("");
  const rec = value as unknown as Record<string, unknown>;
  const setKey = (key: string, v: string) => onChange({ ...value, [key]: v } as LeadFormValue);
  const set = (patch: Partial<LeadFormValue>) => onChange({ ...value, ...patch });

  function addTag() {
    const t = tagDraft.trim();
    if (!t) return;
    if (!value.tags.includes(t)) set({ tags: [...value.tags, t] });
    setTagDraft("");
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {GROUP_ORDER.map((group) => {
        const fields = LEAD_FIELDS.filter((f) => f.group === group && !SPECIAL.has(f.key));
        if (!fields.length) return null;
        return (
          <section key={group}>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {GROUP_LABEL[group]}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {fields.map((f) => (
                <Field key={f.key} label={f.label} required={f.key === "email"}>
                  {renderControl(f, String(rec[f.key] ?? ""), (v) => setKey(f.key, v))}
                </Field>
              ))}
            </div>
          </section>
        );
      })}

      <Field label="Tags">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-2">
          {value.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs"
            >
              {t}
              <button
                type="button"
                onClick={() => set({ tags: value.tags.filter((x) => x !== t) })}
                className="text-muted-foreground hover:text-ink"
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="Add tag…"
            className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
          />
        </div>
      </Field>

      <Field label="Notes">
        <textarea
          value={value.notes ?? ""}
          onChange={(e) => set({ notes: e.target.value })}
          rows={4}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-ink px-5 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function renderControl(f: FieldDef, val: string, onChange: (v: string) => void) {
  const sel = SELECTS[f.key];
  if (sel)
    return (
      <Select
        value={val}
        onChange={onChange}
        options={sel.options as unknown as string[]}
        labels={sel.labels}
        placeholder="Select"
      />
    );
  const type = f.key === "email" ? "email" : f.type === "number" ? "number" : "text";
  return <Input type={type} required={f.key === "email"} value={val} onChange={onChange} />;
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      required={required}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
    >
      <option value="">{placeholder ?? "Any"}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o}
        </option>
      ))}
    </select>
  );
}
