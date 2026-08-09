import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Dock Owner Console" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      icon={SettingsIcon}
      title="Settings"
      description="Manage your workspace, integrations, users, and system preferences."
      bullets={["Workspace profile", "Team members and roles", "Integrations and API keys", "Notification preferences"]}
    />
  ),
});