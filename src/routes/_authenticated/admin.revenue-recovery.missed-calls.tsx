import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/missed-calls")({
  head: () => ({ meta: [{ title: "Missed Calls Calculator — Dock" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Capture every inbound opportunity"
      title="Missed Calls Calculator"
      description="Calculate the annual revenue lost to missed calls, voicemails and after-hours enquiries — and see what's recoverable."
    />
  ),
});
