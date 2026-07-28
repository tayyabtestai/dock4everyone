import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/leakage")({
  head: () => ({ meta: [{ title: "Revenue Leakage Calculator — Dock" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Recover lost revenue"
      title="Revenue Leakage Calculator"
      description="Pinpoint exactly where revenue leaves your operation and estimate the annual value of each leak. Questions, scoring and reporting are being crafted for launch."
    />
  ),
});
