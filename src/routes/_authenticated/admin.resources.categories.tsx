import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const Route = createFileRoute("/_authenticated/admin/resources/categories")({
  head: () => ({ meta: [{ title: "Categories — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Resources"
      title="Categories"
      description="Organise your archive into curated categories so readers can navigate the collection by subject."
    />
  ),
});