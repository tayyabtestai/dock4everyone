import { useState } from "react";
import { INDUSTRIES, SOURCES, PLATFORMS, STATUSES, STATUS_LABEL } from "@/lib/leads/taxonomy";
import type { LeadWrite } from "@/lib/leads/schemas";

export type LeadFormValue = LeadWrite & { tags: string[] };

export const EMPTY_LEAD: LeadFormValue = {
  first_name: "", last_name: "", full_name: "", email: "", phone: "",
  business_name: "", industry: "", website: "", source: "", platform: "",
  status: "new", tags: [], notes: "", job_title: "", location: "", country: "", funnel_name: "",
};

export function LeadForm({
  value, onChange, onSubmit, onCancel, submitting, submitLabel,
}: {
  value: LeadFormValue;
  onChange: (v: LeadFormValue) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [tagDraft, setTagDraft] = useState("");
  const set = (patch: Partial<LeadFormValue>) => onChange({ ...value, ...patch });

  function addTag() {
    const t = tagDraft.trim();
    if (!t) return;
    if (!value.tags.includes(t)) set({ tags: [...value.tags, t] });
    setTagDraft("");
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name"><Input value={value.first_name ?? ""} onChange={(v) => set({ first_name: v })} /></Field>
        <Field label="Last name"><Input value={value.last_name ?? ""} onChange={(v) => set({ last_name: v })} /></Field>
        <Field label="Email" required><Input type="email" required value={value.email} onChange={(v) => set({ email: v })} /></Field>
        <Field label="Phone"><Input value={value.phone ?? ""} onChange={(v) => set({ phone: v })} /></Field>
        <Field label="Business name"><Input value={value.business_name ?? ""} onChange={(v) => set({ business_name: v })} /></Field>
        <Field label="Industry">
          <Select value={value.industry ?? ""} onChange={(v) => set({ industry: v })} options={INDUSTRIES as unknown as string[]} placeholder="Select industry" />
        </Field>
        <Field label="Website (optional)"><Input placeholder="example.com" value={value.website ?? ""} onChange={(v) => set({ website: v })} /></Field>
        <Field label="Job title"><Input value={value.job_title ?? ""} onChange={(v) => set({ job_title: v })} /></Field>
        <Field label="Source">
          <Select value={value.source ?? ""} onChange={(v) => set({ source: v })} options={SOURCES as unknown as string[]} placeholder="Acquisition source" />
        </Field>
        <Field label="Platform">
          <Select value={value.platform ?? ""} onChange={(v) => set({ platform: v })} options={PLATFORMS as unknown as string[]} placeholder="Specific platform" />
        </Field>
        <Field label="Funnel"><Input placeholder="Not connected yet" value={value.funnel_name ?? ""} onChange={(v) => set({ funnel_name: v })} /></Field>
        <Field label="Status">
          <Select
            value={value.status ?? "new"}
            onChange={(v) => set({ status: v })}
            options={STATUSES as unknown as string[]}
            labels={STATUS_LABEL}
          />
        </Field>
        <Field label="Location"><Input value={value.location ?? ""} onChange={(v) => set({ location: v })} /></Field>
        <Field label="Country"><Input value={value.country ?? ""} onChange={(v) => set({ country: v })} /></Field>
      </div>

      <Field label="Tags">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-2">
          {value.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
              {t}
              <button type="button" onClick={() => set({ tags: value.tags.filter((x) => x !== t) })} className="text-muted-foreground hover:text-ink">×</button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
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
        <button type="button" onClick={onCancel} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Cancel</button>
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

export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}{required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function Input({ value, onChange, type = "text", required, placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
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

export function Select({ value, onChange, options, placeholder, labels }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
    >
      <option value="">{placeholder ?? "Any"}</option>
      {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
    </select>
  );
}
