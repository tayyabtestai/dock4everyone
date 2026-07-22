import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ResourceCard, type ResourceCardData } from "@/components/resource-card";

const featuredQuery = queryOptions({
  queryKey: ["resources", "featured"],
  queryFn: async (): Promise<ResourceCardData[]> => {
    const { data, error } = await supabase
      .from("resources")
      .select("id, slug, title, description, category, thumbnail_url, button_text")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) throw error;
    return (data ?? []) as ResourceCardData[];
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dock — Free Resources, Better Learning" },
      { name: "description", content: "A quiet archive of curated PDFs, repositories, guides, and AI frameworks for the modern practitioner. No noise, just utility." },
      { property: "og:title", content: "Dock — Free Resources, Better Learning" },
      { property: "og:description", content: "Curated PDFs, repositories, guides, and AI frameworks — free." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredQuery),
  component: Index,
});

function Index() {
  const { data: resources } = useSuspenseQuery(featuredQuery);

  return (
    <div className="min-h-screen bg-canvas">
      <SiteNav />

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-[70ch]">
            <p className="eyebrow mb-6 animate-in fade-in duration-700">Index • The Archive</p>
            <h1 className="mb-8 animate-in fade-in slide-in-from-bottom-4 text-balance font-serif text-5xl leading-none text-ink duration-1000 md:text-7xl">
              Free Resources. <br />Better Learning.
            </h1>
            <p className="mb-10 max-w-[56ch] animate-in fade-in slide-in-from-bottom-6 text-pretty text-lg leading-relaxed text-muted-foreground duration-1000 md:text-xl">
              A quiet collection of curated PDF guides, technical repositories, AI prompts, and systematic frameworks for the modern practitioner. No noise, just utility.
            </p>
            <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <Link
                to="/resources"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground ring-1 ring-accent transition-opacity hover:opacity-90"
              >
                Explore Resources
              </Link>
              <Link
                to="/about"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink shadow-sm ring-1 ring-border transition-colors hover:bg-secondary"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories strip */}
      <div className="border-y border-border bg-secondary/50">
        <div className="mx-auto flex max-w-6xl gap-8 overflow-x-auto no-scrollbar px-6 py-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span className="shrink-0 text-ink">All Assets</span>
          {["Engineering", "Design Systems", "AI Frameworks", "Strategy", "Marketing"].map((c) => (
            <span key={c} className="shrink-0 cursor-default transition-colors hover:text-ink">{c}</span>
          ))}
        </div>
      </div>

      {/* Featured */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <p className="eyebrow mb-2">Featured</p>
              <h2 className="font-serif text-3xl leading-tight text-ink md:text-4xl">Recently catalogued.</h2>
            </div>
            <Link to="/resources" className="hidden text-sm font-medium text-ink/70 underline-offset-4 hover:text-ink hover:underline md:inline">
              View all →
            </Link>
          </div>
          {resources.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {resources.map((r) => <ResourceCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      </section>

      {/* Inline archive CTA */}
      <section className="border-t border-border bg-secondary/60 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-start gap-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-border md:p-12">
            <span className="eyebrow text-accent">Direct Access</span>
            <h2 className="text-balance font-serif text-3xl leading-tight md:text-4xl">
              Every resource is free. Enter your details once when you request one — that's the whole ceremony.
            </h2>
            <p className="max-w-[56ch] text-pretty text-muted-foreground">
              Dock is a private archive of the resources I share on social. No paywalls, no gating games — just a way to know who's reading.
            </p>
            <Link
              to="/resources"
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-accent"
            >
              Browse the archive
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white/50 p-12 text-center">
      <p className="eyebrow mb-3">Awaiting first entry</p>
      <p className="font-serif text-2xl italic text-ink/70">The archive is quiet.</p>
      <p className="mt-2 text-sm text-muted-foreground">Sign in as admin to publish your first resource.</p>
    </div>
  );
}
