import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/crm/activity")({
  head: () => ({ meta: [{ title: "Activity — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="CRM" title="Activity" description="A living timeline of every touch — opens, clicks, downloads, replies." />
  ),
});
