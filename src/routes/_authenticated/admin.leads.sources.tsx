import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/leads/sources")({
  head: () => ({ meta: [{ title: "Lead sources — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="Leads" title="Sources" description="Where every lead came from — resources, campaigns, referrals, and search." />
  ),
});
