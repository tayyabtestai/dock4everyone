import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Dock Owner Console" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      icon={BarChart3}
      title="Analytics"
      description="Track funnel, lead, and campaign performance in one place."
      bullets={["Attribution reporting", "Funnel conversion analysis", "Campaign performance", "Exportable reports"]}
    />
  ),
});