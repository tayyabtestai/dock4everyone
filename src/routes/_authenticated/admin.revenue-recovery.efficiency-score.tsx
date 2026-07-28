import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/efficiency-score")({
  head: () => ({ meta: [{ title: "Business Efficiency Score — Dock" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Understand operational strength at a glance"
      title="Business Efficiency Score"
      description="Benchmark day-to-day operations across time, tools, people and process to see where your business truly stands."
    />
  ),
});
