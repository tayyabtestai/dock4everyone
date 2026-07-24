import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/email/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="Email" title="Campaigns" description="Plan, write, and send broadcasts to segments of your audience." />
  ),
});
