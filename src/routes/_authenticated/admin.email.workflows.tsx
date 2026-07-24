import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/email/workflows")({
  head: () => ({ meta: [{ title: "Workflows — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="Email" title="Workflows" description="Automated sequences that respond to reader behaviour with quiet precision." />
  ),
});
