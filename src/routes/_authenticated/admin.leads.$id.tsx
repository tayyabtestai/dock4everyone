import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink, Pencil, Trash2, ChevronDown } from "lucide-react";
import { adminGetLead, adminUpdateLead, adminDeleteLeads } from "@/lib/leads/admin.functions";
import { STATUS_LABEL } from "@/lib/leads/taxonomy";
import { LeadForm, type LeadFormValue } from "@/components/admin/lead-form";
import { Modal } from "./admin.leads.index";

export const Route = createFileRoute("/_authenticated/admin/leads/$id")({
  head: () => ({ meta: [{ title: "Lead profile — Dock Owner Console" }, { name: "robots", content: "noindex" }] }),
  component: LeadDetail,
});

function LeadDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(adminGetLead);
  const update = useServerFn(adminUpdateLead);
  const del = useServerFn(adminDeleteLeads);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<LeadFormValue | null>(null);
  const [funnelOpen, setFunnelOpen] = useState(false);

  const q = useQuery({ queryKey: ["admin", "lead", id], queryFn: () => get({ data: { id } }) });
  const lead = q.data;

  const saveMut = useMutation({
    mutationFn: (patch: LeadFormValue) => update({ data: { id, patch } }),
    onSuccess: () => { toast.success("Lead updated"); setEditing(false); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => del({ data: { ids: [id] } }),
    onSuccess: () => { toast.success("Lead deleted"); qc.invalidateQueries({ queryKey: ["admin"] }); navigate({ to: "/admin/leads", search: {} }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return <div className="mx-auto max-w-4xl space-y-3 px-5 py-14 md:px-8">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/60" />)}</div>;
  }
  if (q.isError) {
    return <div className="mx-auto max-w-4xl px-5 py-14 text-sm text-destructive md:px-8">Could not load this lead. {(q.error as Error).message}</div>;
  }
  if (!lead) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-20 text-center md:px-8">
        <p className="font-serif text-3xl italic text-ink/70">Lead not found</p>
        <Link to="/admin/leads" search={{}} className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Back to leads</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-14">
      <Link to="/admin/leads" search={{}} className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All leads
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">{STATUS_LABEL[lead.status] ?? lead.status}</p>
          <h1 className="font-serif text-4xl leading-tight">{lead.full_name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{lead.business_name || "No business recorded"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setForm({
                first_name: lead.first_name ?? "", last_name: lead.last_name ?? "", full_name: lead.full_name,
                email: lead.email, phone: lead.phone ?? "", business_name: lead.business_name ?? "",
                industry: lead.industry ?? "", website: lead.website ?? "", source: lead.source ?? "",
                platform: lead.platform ?? "", status: lead.status, tags: lead.tags ?? [], notes: lead.notes ?? "",
                job_title: lead.job_title ?? "", location: lead.location ?? "", country: lead.country ?? "",
                funnel_name: lead.funnel_name ?? "",
              });
              setEditing(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={() => { if (window.confirm("Delete this lead? This cannot be undone.")) deleteMut.mutate(); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Contact">
          <Row label="Name" value={lead.full_name} />
          <Row label="Email" value={<a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>} />
          <Row label="Phone" value={lead.phone || "Not provided"} />
          <Row label="Job title" value={lead.job_title || "Not provided"} />
        </Panel>

        <Panel title="Business">
          <Row label="Business name" value={lead.business_name || "Not provided"} />
          <Row label="Industry" value={lead.industry || "Not provided"} />
          <Row
            label="Website"
            value={lead.website ? (
              <a href={lead.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 hover:underline">
                {lead.website.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
              </a>
            ) : "Not provided"}
          />
          <Row label="Location" value={[lead.location, lead.country].filter(Boolean).join(", ") || "Not provided"} />
        </Panel>

        <Panel title="Source">
          <Row label="Source" value={lead.source || "Not provided"} />
          <Row label="Platform" value={lead.platform || "Not provided"} />
          <Row label="Funnel" value={lead.funnel_name || "Not connected"} />
        </Panel>

        <Panel title="Status">
          <Row label="Current status" value={STATUS_LABEL[lead.status] ?? lead.status} />
          <div className="py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tags</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(lead.tags ?? []).length
                ? (lead.tags ?? []).map((t) => <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{t}</span>)
                : <span className="text-sm text-muted-foreground">No tags</span>}
            </div>
          </div>
        </Panel>

        <Panel title="Activity">
          <Row label="Created" value={format(new Date(lead.created_at), "MMM d, yyyy · HH:mm")} />
          <Row label="Updated" value={format(new Date(lead.updated_at), "MMM d, yyyy · HH:mm")} />
        </Panel>

        <Panel title="Notes">
          <p className="whitespace-pre-wrap py-1 text-sm text-ink/80">{lead.notes || "No notes yet."}</p>
        </Panel>
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-white">
        <button onClick={() => setFunnelOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left">
          <span className="font-serif text-xl">Funnel Assessment Data</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${funnelOpen ? "" : "-rotate-90"}`} />
        </button>
        {funnelOpen && (
          <div className="border-t border-border px-5 py-4 text-sm text-muted-foreground">
            {lead.funnel_response_data || lead.funnel_result ? (
              <pre className="overflow-x-auto rounded-lg bg-secondary/40 p-3 text-xs">
                {JSON.stringify({ answers: lead.funnel_response_data, result: lead.funnel_result, score: lead.funnel_score }, null, 2)}
              </pre>
            ) : (
              "No assessment data yet."
            )}
          </div>
        )}
      </section>

      {editing && form && (
        <Modal title="Edit lead" onClose={() => setEditing(false)}>
          <LeadForm
            value={form}
            onChange={setForm}
            submitting={saveMut.isPending}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={() => saveMut.mutate(form)}
          />
        </Modal>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h2 className="mb-3 font-serif text-xl">{title}</h2>
      <div className="divide-y divide-border/70">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className="truncate text-right text-sm text-ink/85">{value}</span>
    </div>
  );
}
