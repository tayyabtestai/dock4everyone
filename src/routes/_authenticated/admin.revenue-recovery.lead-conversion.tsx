import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/lead-conversion")({
  head: () => ({ meta: [{ title: "Lead Conversion Audit — Dock" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Convert more of the leads you already earn"
      title="Lead Conversion Audit"
      description="Diagnose the drop-off points in your funnel and estimate the revenue you leave on the table every month."
    />
  ),
});
