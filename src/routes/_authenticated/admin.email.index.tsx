import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/email/")({
  head: () => ({ meta: [{ title: "Email — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="Email" title="Editorial email" description="Campaigns, templates, and workflows composed with the same care as the archive itself." />
  ),
});
