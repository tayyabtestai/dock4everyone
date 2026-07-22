import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Dock" },
      { name: "description", content: "Dock is a personal, curated archive of free digital resources shared across social platforms." },
      { property: "og:title", content: "About — Dock" },
      { property: "og:description", content: "A personal, curated archive of free digital resources." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteNav />
      <section className="mx-auto max-w-3xl px-6 py-24 md:py-32">
        <p className="eyebrow mb-6">About</p>
        <h1 className="mb-10 text-balance font-serif text-5xl leading-tight text-ink md:text-6xl">
          A quiet archive, carefully kept.
        </h1>
        <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
          <p>
            Dock is my personal library. Every resource I share on LinkedIn, Instagram, YouTube, or X eventually ends up here — indexed, described, and free to unlock.
          </p>
          <p>
            The only ceremony is a one-time introduction. You enter your name, email, and where you found me, then everything opens. No paywalls. No upsells. No newsletter you didn't ask for.
          </p>
          <p>
            The archive grows slowly and on purpose. If a piece isn't useful, it doesn't get catalogued.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
