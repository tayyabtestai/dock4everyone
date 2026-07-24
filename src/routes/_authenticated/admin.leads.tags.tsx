import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/leads/tags")({
  head: () => ({ meta: [{ title: "Lead tags — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="Leads" title="Tags" description="A quiet taxonomy for segmenting leads by interest, intent, and lifecycle." />
  ),
});
