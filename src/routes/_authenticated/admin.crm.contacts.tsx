import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/crm/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="CRM" title="Contacts" description="Every person who has entered the archive — captured, enriched, and quietly organised." />
  ),
});
