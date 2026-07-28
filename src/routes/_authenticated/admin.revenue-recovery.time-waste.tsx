import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/time-waste")({
  head: () => ({ meta: [{ title: "Time Waste Calculator — Dock" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Reclaim hours across your team"
      title="Time Waste Calculator"
      description="Translate manual, repetitive work into the exact number of hours and dollars it costs your business each month."
    />
  ),
});
