import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ResourceCard, type ResourceCardData } from "@/components/resource-card";

const allQuery = queryOptions({
  queryKey: ["resources", "all-published"],
  queryFn: async (): Promise<ResourceCardData[]> => {
    const { data, error } = await supabase
      .from("resources")
      .select("id, slug, title, description, category, thumbnail_url, button_text")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ResourceCardData[];
  },
});

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Dock" },
      { name: "description", content: "Browse the complete Dock archive of free PDFs, repositories, AI frameworks, and guides." },
      { property: "og:title", content: "Resources — Dock" },
      { property: "og:description", content: "The complete Dock archive." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(allQuery),
  component: ResourcesPage,
});

function ResourcesPage() {
  const { data: resources } = useSuspenseQuery(allQuery);
  const [active, setActive] = useState<string>("All");
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(resources.map((r) => r.category)))],
    [resources]
  );
  const filtered = active === "All" ? resources : resources.filter((r) => r.category === active);

  return (
    <div className="min-h-screen bg-canvas">
      <SiteNav />
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <p className="eyebrow mb-6">The Archive</p>
          <h1 className="max-w-3xl text-balance font-serif text-4xl leading-tight md:text-6xl">Every resource, catalogued.</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            {resources.length} {resources.length === 1 ? "entry" : "entries"} available. All free — enter your details once when you unlock one.
          </p>
        </div>
      </header>

      <div className="border-b border-border bg-secondary/50">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto no-scrollbar px-6 py-4">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-widest transition-colors ${
                active === c ? "bg-ink text-primary-foreground" : "text-muted-foreground hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="font-serif text-2xl italic text-ink/70">Nothing here yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => <ResourceCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
