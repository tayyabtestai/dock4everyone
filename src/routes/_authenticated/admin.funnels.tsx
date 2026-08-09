import { createFileRoute } from "@tanstack/react-router";
import { Filter } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const Route = createFileRoute("/_authenticated/admin/funnels")({
  head: () => ({ meta: [{ title: "Funnels — Dock Owner Console" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      icon={Filter}
      title="Funnels"
      description="Build interactive assessments, qualify visitors, and turn responses into actionable leads."
      bullets={["Visual question builder", "Branching logic", "Scoring and qualification", "Auto-create leads on submit"]}
    />
  ),
});