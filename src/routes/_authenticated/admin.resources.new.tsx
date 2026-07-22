import { createFileRoute } from "@tanstack/react-router";
import { ResourceForm } from "@/components/admin/resource-form";

export const Route = createFileRoute("/_authenticated/admin/resources/new")({
  head: () => ({ meta: [{ title: "New resource — Dock Admin" }, { name: "robots", content: "noindex" }] }),
  component: NewResource,
});

function NewResource() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <p className="eyebrow mb-3">Create</p>
      <h1 className="mb-10 font-serif text-4xl leading-tight">New resource</h1>
      <ResourceForm mode="create" />
    </div>
  );
}
