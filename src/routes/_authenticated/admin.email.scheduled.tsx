import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/email/scheduled")({
  head: () => ({ meta: [{ title: "Scheduled — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="Email" title="Scheduled" description="Letters queued to go out at exactly the right moment." />
  ),
});
