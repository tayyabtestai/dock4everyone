import { useState } from "react";

export type LeadForm = {
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
};

type Props = {
  onSubmit: (v: LeadForm) => void | Promise<void>;
  submitting?: boolean;
  ctaLabel?: string;
  requirePhone?: boolean;
  requireCompany?: boolean;
  requireWebsite?: boolean;
};

export function LeadCaptureForm({ onSubmit, submitting, ctaLabel, requirePhone, requireCompany, requireWebsite }: Props) {
  const [form, setForm] = useState<LeadForm>({ email: "" });
  const input = "w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink";

  function set<K extends keyof LeadForm>(k: K, v: LeadForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void onSubmit(form); }}
      className="grid gap-4"
    >
      <label className="grid gap-1.5 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Full name</span>
        <input className={input} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Email</span>
        <input required type="email" className={input} value={form.email} onChange={(e) => set("email", e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Phone{requirePhone ? "" : " (optional)"}</span>
        <input required={requirePhone} className={input} value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Company{requireCompany ? "" : " (optional)"}</span>
        <input required={requireCompany} className={input} value={form.company ?? ""} onChange={(e) => set("company", e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Website{requireWebsite ? "" : " (optional)"}</span>
        <input required={requireWebsite} className={input} value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 inline-flex items-center justify-center rounded-md bg-ink px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Sending…" : (ctaLabel ?? "Get my report")}
      </button>
    </form>
  );
}