import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { LeadCaptureForm } from "@/components/lead-capture-form";
import { ArrowLeft } from "lucide-react";

type PublicResource = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  resource_type: string;
  button_text: string;
};

const resourceQuery = (slug: string) =>
  queryOptions({
    queryKey: ["resource", slug],
    queryFn: async (): Promise<PublicResource | null> => {
      const { data, error } = await supabase
        .from("resources")
        .select("id, slug, title, description, category, thumbnail_url, resource_type, button_text")
        .eq("status", "published")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as PublicResource | null;
    },
  });

export const Route = createFileRoute("/resource/$slug")({
  loader: async ({ params, context }) => {
    const r = await context.queryClient.ensureQueryData(resourceQuery(params.slug));
    if (!r) throw notFound();
    return r;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Unavailable — Dock" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.title} — Dock`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.description || "A free resource from the Dock archive." },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.description || "A free resource from the Dock archive." },
        ...(loaderData.thumbnail_url ? [
          { property: "og:image", content: loaderData.thumbnail_url },
          { name: "twitter:image", content: loaderData.thumbnail_url },
        ] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-canvas">
      <SiteNav />
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="eyebrow mb-4">Not found</p>
        <h1 className="font-serif text-5xl">This entry is not in the archive.</h1>
        <Link to="/resources" className="mt-8 inline-flex items-center gap-2 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to resources
        </Link>
      </div>
    </div>
  ),
  component: ResourcePage,
});

function ResourcePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(resourceQuery(slug));
  const r = data!;

  return (
    <div className="min-h-screen bg-canvas">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link to="/resources" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to Resources
        </Link>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="mb-6 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-secondary outline outline-1 -outline-offset-1 outline-border">
              {r.thumbnail_url ? (
                <img src={r.thumbnail_url} alt={r.title} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <span className="eyebrow opacity-60">{r.category}</span>
                </div>
              )}
            </div>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">{r.category}</span>
              <span className="rounded-full bg-accent/5 px-2 py-0.5 text-[10px] font-medium text-accent ring-1 ring-accent/10">Free</span>
            </div>
            <h1 className="text-balance font-serif text-4xl leading-tight text-ink md:text-5xl">{r.title}</h1>
            {r.description && (
              <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">{r.description}</p>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-border md:p-8">
              <span className="eyebrow mb-3 block text-accent">Unlock</span>
              <h2 className="mb-2 font-serif text-2xl leading-tight">Get instant access.</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Enter your details to unlock this resource immediately.
              </p>
              <LeadCaptureForm resourceId={r.id} />
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
