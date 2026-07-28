import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/roi")({
  head: () => ({ meta: [{ title: "AI ROI Calculator — Dock" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Make investment decisions with confidence"
      title="AI ROI Calculator"
      description="Project the financial impact of intelligent systems across revenue, cost and time — using your own numbers."
    />
  ),
});
