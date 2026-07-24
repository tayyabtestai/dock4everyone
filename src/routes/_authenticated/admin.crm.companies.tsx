import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/crm/companies")({
  head: () => ({ meta: [{ title: "Companies — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage eyebrow="CRM" title="Companies" description="Group contacts by the teams and organisations they belong to." />
  ),
});
