import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listResources from "./tools/list-resources";
import getResource from "./tools/get-resource";
import listLeads from "./tools/list-leads";
import dashboardStats from "./tools/dashboard-stats";
import { createResource, updateResource } from "./tools/upsert-resource";
import deleteResource from "./tools/delete-resource";
import createSignedUrl from "./tools/create-signed-url";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "dock-mcp",
  title: "Dock",
  version: "0.1.0",
  instructions:
    "Owner-only admin tools for the Dock lead-generation archive. Manage resources (create/update/delete/publish), review captured leads, and generate short-lived signed URLs for stored files. All tools require admin role.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listResources,
    getResource,
    listLeads,
    dashboardStats,
    createResource,
    updateResource,
    deleteResource,
    createSignedUrl,
  ],
});
