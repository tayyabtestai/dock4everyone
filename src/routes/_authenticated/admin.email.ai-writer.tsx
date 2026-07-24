import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/email/ai-writer")({
  head: () => ({ meta: [{ title: "AI Writer — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="Email" title="AI Writer" description="Draft considered emails in seconds, tuned to your tone." />
  ),
});
