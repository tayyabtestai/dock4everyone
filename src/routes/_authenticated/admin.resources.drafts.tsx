import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/resources/drafts")({
  head: () => ({ meta: [{ title: "Drafts — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Resources"
      title="Drafts"
      description="A quiet corner for work-in-progress resources before they enter the public archive."
    />
  ),
});