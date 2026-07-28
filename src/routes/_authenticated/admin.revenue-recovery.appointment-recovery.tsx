import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/appointment-recovery")({
  head: () => ({ meta: [{ title: "Appointment Recovery Calculator — Dock" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Fill more of the calendar you already own"
      title="Appointment Recovery Calculator"
      description="Quantify no-shows, cancellations and rescheduling gaps and see how much of that revenue is recoverable."
    />
  ),
});
