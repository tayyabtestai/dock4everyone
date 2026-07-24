import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/leads/imported")({
  head: () => ({ meta: [{ title: "Imported leads — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="Leads" title="Imported" description="Bring leads in from CSVs and external tools without breaking the archive." />
  ),
});
