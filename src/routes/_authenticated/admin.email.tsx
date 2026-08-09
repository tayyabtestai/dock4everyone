import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/_authenticated/admin/email")({
  head: () => ({ meta: [{ title: "Email Automation — Dock Owner Console" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      icon={Mail}
      title="Email Automation"
      description="Create campaigns, templates, audiences, and automated follow-ups."
      bullets={["Campaign composer", "Reusable templates", "Audiences from saved lead views", "Automated follow-up sequences"]}
    />
  ),
});