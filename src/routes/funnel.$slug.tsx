import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { fetchPublishedFunnel, logFunnelEvent, funnelSessionId } from "@/lib/funnels/public";
import { submitFunnel } from "@/lib/funnels/public.functions";
import { PublicRunner } from "@/components/funnel/public-runner";
import type { Answers, Contact, FunnelResult } from "@/lib/funnels/engine";

const funnelQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-funnel", slug],
    queryFn: () => fetchPublishedFunnel(slug),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/funnel/$slug")({
  loader: async ({ params, context }) => {
    const f = await context.queryClient.ensureQueryData(funnelQuery(params.slug));
    if (!f) throw notFound();
    return f;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Unavailable — Dock" }] };
    const title = `${loaderData.snapshot.name} — Dock`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: loaderData.snapshot.description || loaderData.snapshot.tagline,
        },
      ],
    };
  },
  notFoundComponent: () => (
    <Shell>
      <div className="mx-auto max-w-lg py-24 text-center">
        <p className="eyebrow mb-3 text-accent">Not available</p>
        <h1 className="font-serif text-4xl text-ink">This funnel isn’t published.</h1>
        <Link to="/" className="mt-6 inline-block text-sm text-accent hover:underline">
          Return home
        </Link>
      </div>
    </Shell>
  ),
  component: FunnelPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-serif text-xl text-ink">
            Dock
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Assessment
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
    </div>
  );
}

function FunnelPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(funnelQuery(slug));
  const funnel = data!;
  const navigate = useNavigate();
  const runSubmit = useServerFn(submitFunnel);

  useEffect(() => {
    logFunnelEvent(funnel.calculatorId, slug, "viewed");
  }, [funnel.calculatorId, slug]);

  async function handleSubmit(answers: Answers, contact: Contact): Promise<FunnelResult> {
    const res = await runSubmit({
      data: {
        slug,
        answers: answers as Record<string, unknown>,
        contact,
        sessionId: funnelSessionId(),
        meta: {
          referrer: typeof document !== "undefined" ? document.referrer : undefined,
        },
      },
    });
    return res.result as FunnelResult;
  }

  return (
    <Shell>
      <PublicRunner
        snapshot={funnel.snapshot}
        onSubmit={handleSubmit}
        onEvent={(event, extra) => {
          if (
            event === "started" ||
            event === "contact_gate_viewed" ||
            event === "result_viewed" ||
            event === "cta_clicked" ||
            event === "recommendation_clicked"
          ) {
            logFunnelEvent(
              funnel.calculatorId,
              slug,
              event === "cta_clicked" ? "calendly_clicked" : event,
              {
                industry: typeof extra?.industry === "string" ? extra.industry : null,
                payload: extra,
              },
            );
          }
        }}
        onNavigateFunnel={(nextSlug) =>
          navigate({ to: "/funnel/$slug", params: { slug: nextSlug } })
        }
      />
    </Shell>
  );
}
