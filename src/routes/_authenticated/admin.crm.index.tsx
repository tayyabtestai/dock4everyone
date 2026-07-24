import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/crm/")({
  head: () => ({ meta: [{ title: "CRM — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="CRM"
      title="Customer relationships"
      description="A calm, editorial CRM built into the Owner Console — contacts, companies, and activity in one place."
    />
  ),
});