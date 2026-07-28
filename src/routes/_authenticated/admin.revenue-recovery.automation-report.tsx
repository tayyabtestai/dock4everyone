import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/automation-report")({
  head: () => ({ meta: [{ title: "Automation Opportunity Report — Dock" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Move forward with a clear implementation path"
      title="Automation Opportunity Report"
      description="Receive a prioritised, business-language plan for the systems that will pay for themselves fastest."
    />
  ),
});
