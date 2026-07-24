import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/email/sent")({
  head: () => ({ meta: [{ title: "Sent — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="Email" title="Sent" description="An archive of every letter that has left the desk." />
  ),
});
