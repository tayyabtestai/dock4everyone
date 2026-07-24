import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { assertAdmin, text } from "../supabase";

const ResourceType = z.enum(["pdf", "image", "video", "github", "drive", "website"]);
const Status = z.enum(["draft", "published"]);

const base = {
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "lowercase, numbers, hyphens"),
  description: z.string().max(2000).default(""),
  category: z.string().trim().min(1).max(80),
  thumbnail_url: z.string().url().optional(),
  resource_type: ResourceType,
  button_text: z.string().trim().min(1).max(60).default("Get Resource"),
  status: Status,
  file_path: z.string().max(500).optional(),
  external_url: z.string().url().max(1000).optional(),
};

export const createResource = defineTool({
  name: "create_resource",
  title: "Create resource",
  description: "Create a new Dock resource. For file-based types, upload the file via the admin UI first and pass its file_path.",
  inputSchema: base,
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async (input, ctx) => {
    const sb = await assertAdmin(ctx);
    const { data, error } = await sb.from("resources").insert({
      ...input,
      thumbnail_url: input.thumbnail_url ?? null,
      file_path: input.file_path ?? null,
      external_url: input.external_url ?? null,
    }).select("id, slug").single();
    if (error) throw new Error(error.message);
    return text({ created: data });
  },
});

export const updateResource = defineTool({
  name: "update_resource",
  title: "Update resource",
  description: "Update an existing resource. Set status to 'published' or 'draft' to publish/unpublish.",
  inputSchema: {
    id: z.string().uuid(),
    ...Object.fromEntries(Object.entries(base).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])) as {
      [K in keyof typeof base]: z.ZodOptional<typeof base[K]>;
    },
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async ({ id, ...patch }, ctx) => {
    const sb = await assertAdmin(ctx);
    const { data, error } = await sb.from("resources").update(patch).eq("id", id).select("id, slug, status").single();
    if (error) throw new Error(error.message);
    return text({ updated: data });
  },
});
