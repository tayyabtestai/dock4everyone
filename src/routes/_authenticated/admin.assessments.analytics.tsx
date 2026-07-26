import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAssessments, assessmentAnalytics } from "@/lib/assessments.functions";

export const Route = createFileRoute("/_authenticated/admin/assessments/analytics")({
  head: () => ({ meta: [{ title: "Assessment Analytics — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) || "" }),
  component: Analytics,
});

function Analytics() {
  const list = useServerFn(listAssessments);
  const stats = useServerFn(assessmentAnalytics);
  const search = Route.useSearch();
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>(search.id);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => { list().then((r) => { setItems(r); if (!selected && r[0]) setSelected(r[0].id); }); }, []);
  useEffect(() => { if (selected) stats({ data: { id: selected } }).then(setData); }, [selected]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <p className="eyebrow mb-2">Assessment Engine</p>
      <h1 className="font-serif text-4xl leading-tight text-ink">Analytics</h1>
      <div className="mt-6">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm">
          <option value="">Select an assessment…</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      {!data && <p className="mt-10 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Pick an assessment to view analytics.</p>}
      {data && (
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Stat label="Views" value={data.views} />
          <Stat label="Starts" value={data.starts} />
          <Stat label="Completed" value={data.completed} />
          <Stat label="Completion rate" value={data.completion_rate == null ? "—" : `${Math.round(data.completion_rate * 100)}%`} />
          <Stat label="Avg. time (sec)" value={data.avg_time_sec ?? "—"} />
          <Stat label="Leads generated" value={data.leads} />
          <Stat label="Drop-off question" value={data.dropoff_question ?? "—"} />
          <Stat label="Recent submissions" value={data.recent_submissions?.length ?? 0} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl text-ink">{value}</p>
    </div>
  );
}