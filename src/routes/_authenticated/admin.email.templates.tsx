import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/email/templates")({
  head: () => ({ meta: [{ title: "Templates — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="Email" title="Templates" description="Reusable letterheads and layouts that carry the Dock voice." />
  ),
});
