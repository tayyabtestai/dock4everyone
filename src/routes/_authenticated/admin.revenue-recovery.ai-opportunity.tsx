import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/revenue-recovery/ai-opportunity")({
  head: () => ({ meta: [{ title: "AI Opportunity Scanner — Dock" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Prioritise the highest-impact opportunities"
      title="AI Opportunity Scanner"
      description="Uncover the specific workflows inside your business where intelligent systems generate the highest financial return."
    />
  ),
});
