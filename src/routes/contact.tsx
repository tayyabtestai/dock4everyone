import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Dock" },
      { name: "description", content: "Get in touch about the Dock archive, requests, or collaborations." },
      { property: "og:title", content: "Contact — Dock" },
      { property: "og:description", content: "Get in touch about the Dock archive." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteNav />
      <section className="mx-auto max-w-3xl px-6 py-24 md:py-32">
        <p className="eyebrow mb-6">Contact</p>
        <h1 className="mb-8 text-balance font-serif text-5xl leading-tight md:text-6xl">
          Say hello.
        </h1>
        <p className="mb-12 max-w-xl text-lg text-muted-foreground">
          For collaborations, requests, or corrections to the archive — a short email works best.
        </p>
        <a
          href="mailto:hello@dock.example"
          className="inline-flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-accent"
        >
          <Mail className="h-4 w-4" />
          hello@dock.example
        </a>
      </section>
      <SiteFooter />
    </div>
  );
}
