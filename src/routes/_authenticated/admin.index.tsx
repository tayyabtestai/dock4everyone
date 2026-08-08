import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminLeadStats } from "@/lib/leads/admin.functions";
import { STATUS_LABEL } from "@/lib/leads/taxonomy";
import { format } from "date-fns";
import { ArrowUpRight, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Dock Owner Console" }, { name: "robots", content: "noindex" }] }),
  component: DashboardPage,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const fetchStats = useServerFn(adminLeadStats);
  const q = useQuery({ queryKey: ["admin", "lead-stats"], queryFn: () => fetchStats(), staleTime: 15_000 });
  const s = q.data;

  const delta =
    s && s.yesterday > 0 ? Math.round(((s.today - s.yesterday) / s.yesterday) * 100) : null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
      <header className="mb-10">
        <p className="eyebrow mb-3">Command Center</p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">{greeting()}, Tayyab</h1>
        <p className="mt-3 text-sm text-muted-foreground">Here's what's happening inside Dock today.</p>
      </header>

      {q.isError && (
        <ErrorNote message={(q.error as Error).message} onRetry={() => q.refetch()} />
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total leads" value={s?.total} loading={q.isLoading} note="All time" />
        <Kpi
          label="New leads today"
          value={s?.today}
          loading={q.isLoading}
          note={
            !s ? "" :
            delta === null
              ? (s.yesterday === 0 && s.today === 0 ? "No leads yesterday" : "No comparison yet")
              : `${delta >= 0 ? "+" : ""}${delta}% vs yesterday`
          }
        />
        <Kpi label="Leads this week" value={s?.week} loading={q.isLoading} note="Since Monday" />
        <Kpi label="Leads this month" value={s?.month} loading={q.isLoading} note={format(new Date(), "MMMM yyyy")} />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Breakdown title="Leads by industry" rows={s?.byIndustry} total={s?.total ?? 0} loading={q.isLoading} />
        <Breakdown title="Leads by source" rows={s?.bySource} total={s?.total ?? 0} loading={q.isLoading} />
        <Breakdown title="Leads by platform" rows={s?.byPlatform} total={s?.total ?? 0} loading={q.isLoading} />
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-serif text-xl">Recent leads</h2>
            <p className="text-xs text-muted-foreground">Newest captures across every channel</p>
          </div>
          <Link
            to="/admin/leads"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            View all leads <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {q.isLoading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-secondary/60" />)}
          </div>
        ) : !s?.recent.length ? (
          <div className="px-5 py-14 text-center">
            <p className="font-serif text-2xl italic text-ink/70">No leads yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Leads collected through your funnels and imports will appear here.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/admin/leads" search={{ new: "1" }} className="rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground hover:opacity-90">Add Lead</Link>
              <Link to="/admin/leads/import" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Import Leads</Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-border bg-secondary/30 text-left">
                <tr>
                  <Th>Name</Th><Th>Business</Th><Th>Industry</Th><Th>Email</Th><Th>Source</Th><Th>Created</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {s.recent.map((l: Record<string, string>) => (
                  <tr key={l['id']} className="transition-colors hover:bg-secondary/30">
                    <td className="px-5 py-3">
                      <Link to="/admin/leads/$id" params={{ id: l['id'] as string }} className="font-medium text-ink hover:underline">
                        {l['full_name']}
                      </Link>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {STATUS_LABEL[l['status'] ?? "new"] ?? l['status']}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{l['business_name'] || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{l['industry'] || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{l['email']}</td>
                    <td className="px-5 py-3 text-muted-foreground">{l['source'] || l['platform'] || "—"}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {format(new Date(l['created_at'] as string), "MMM d, HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, note, loading }: { label: string; value?: number; note?: string; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 transition-colors hover:border-ink/20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      {loading ? (
        <div className="mt-3 h-9 w-20 animate-pulse rounded bg-secondary/70" />
      ) : (
        <p className="mt-2 font-serif text-4xl leading-none">{value ?? 0}</p>
      )}
      {note ? <p className="mt-3 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function Breakdown({
  title, rows, total, loading,
}: { title: string; rows?: { label: string; count: number }[]; total: number; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h2 className="font-serif text-xl">{title}</h2>
      {loading ? (
        <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-5 animate-pulse rounded bg-secondary/60" />)}</div>
      ) : !rows?.length ? (
        <p className="mt-4 text-sm text-muted-foreground">Not tracked yet.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.slice(0, 6).map((r) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="truncate text-ink/80">{r.label}</span>
                <span className="ml-3 tabular-nums text-muted-foreground">{r.count}</span>
              </div>
              <div className="mt-1.5 h-[3px] w-full rounded-full bg-secondary">
                <div
                  className="h-[3px] rounded-full bg-ink/70"
                  style={{ width: `${total ? Math.max(4, (r.count / total) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ErrorNote({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
      <span className="text-destructive">Could not load dashboard data. {message}</span>
      <button onClick={onRetry} className="inline-flex items-center gap-1 text-xs font-medium underline">
        Retry <ArrowUpRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</th>;
}
