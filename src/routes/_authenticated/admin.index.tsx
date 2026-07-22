import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [totalResources, totalLeads, todayLeads, recentResources, recentLeads] = await Promise.all([
        supabase.from("resources").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true })
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from("resources").select("id, title, slug, status, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("leads").select("id, full_name, email, platform, created_at, resource_id, resources(title)").order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        totalResources: totalResources.count ?? 0,
        totalLeads: totalLeads.count ?? 0,
        todayLeads: todayLeads.count ?? 0,
        recentResources: recentResources.data ?? [],
        recentLeads: (recentLeads.data ?? []) as any[],
      };
    },
  });

  const s = stats.data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="eyebrow mb-3">Overview</p>
          <h1 className="font-serif text-4xl leading-tight">Dashboard</h1>
        </div>
        <Link to="/admin/resources/new" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent">
          New resource
        </Link>
      </div>

      <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total resources" value={s?.totalResources ?? "—"} />
        <Stat label="Total leads" value={s?.totalLeads ?? "—"} />
        <Stat label="Leads today" value={s?.todayLeads ?? "—"} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Panel title="Recent resources" href="/admin/resources">
          {s?.recentResources.length ? (
            <ul className="divide-y divide-border">
              {s.recentResources.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{r.title}</p>
                    <p className="text-xs text-muted-foreground">/{r.slug}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                    r.status === "published" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                  }`}>{r.status}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>No resources yet.</Empty>}
        </Panel>

        <Panel title="Recent leads" href="/admin/leads">
          {s?.recentLeads.length ? (
            <ul className="divide-y divide-border">
              {s.recentLeads.map((l: any) => (
                <li key={l.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{l.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.email} • via {l.platform}
                      {l.resources?.title && <> • {l.resources.title}</>}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          ) : <Empty>No leads yet.</Empty>}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <p className="eyebrow mb-2">{label}</p>
      <p className="font-serif text-4xl text-ink">{value}</p>
    </div>
  );
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl">{title}</h2>
        <Link to={href} className="text-xs text-muted-foreground hover:text-ink">View all →</Link>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-muted-foreground">{children}</p>;
}
