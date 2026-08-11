import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { fetchPublishedFunnel, logFunnelEvent, funnelSessionId } from "@/lib/funnels/public";
import { submitFunnel } from "@/lib/funnels/public.functions";
import { PublicRunner } from "@/components/funnel/public-runner";
import { Sparkles, HelpCircle, ShieldCheck } from "lucide-react";
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
    <Shell title="Assessment">
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
          Not available
        </p>
        <h1 className="mt-3 font-serif text-4xl text-white">This assessment isn’t published.</h1>
        <Link to="/" className="mt-6 inline-block text-sm text-indigo-300 hover:underline">
          Return home
        </Link>
      </div>
    </Shell>
  ),
  component: FunnelPage,
});

function Shell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#05060a] text-white">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 0%, rgba(79,70,229,0.14), transparent 70%), radial-gradient(40% 30% at 12% 55%, rgba(139,92,246,0.12), transparent 70%), radial-gradient(40% 30% at 88% 55%, rgba(59,130,246,0.10), transparent 70%)",
        }}
      />
      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="leading-tight">
              <span className="block text-[13px] font-bold uppercase tracking-wide text-white">
                AI Automation
              </span>
              <span className="block text-[11px] text-white/45">{title ?? "Assessment"}</span>
            </span>
          </Link>
          <a
            href="mailto:hello@dock.ai"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/60 transition hover:text-white"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Help
          </a>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-2xl justify-center px-4 pb-8 sm:px-6">
        <div className="w-full rounded-3xl border border-white/[0.08] bg-[#0b0d14]/80 p-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-8">
          {children}
        </div>
      </main>

      <footer className="relative z-10 mx-auto max-w-6xl px-5 pb-8 pt-2 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-2 text-xs text-white/35 sm:flex-row">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-white/40" />
            <span>
              <span className="font-medium text-white/55">Your data is secure and private.</span> We
              never share your information.
            </span>
          </span>
          <span>© {new Date().getFullYear()} Dock AI. All rights reserved.</span>
        </div>
      </footer>
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
    <Shell title={funnel.snapshot.name}>
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
