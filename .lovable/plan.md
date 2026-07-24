## Goal

Expose Dock's admin capabilities to Claude via a custom MCP server, secured with owner-only OAuth. Uses `@lovable.dev/mcp-js` mounted at `/mcp` with Supabase OAuth 2.1 as the authorization server.

## Backend inventory (already delivered above)

- REST endpoints: only `GET /sitemap.xml`.
- Edge functions: none.
- Server functions (RPC): `captureLeadAndUnlock` (public), `upsertResource` + `deleteResource` (admin).
- Frontend-only actions: browse resources, admin list resources/leads, storage uploads, auth — all direct supabase-js with RLS.
- Auth model: admin gate via `has_role(uid,'admin')` on `user_roles`.

## MCP tools to expose (owner-only via OAuth)

Read
- `list_resources` — filter by status/category, includes drafts (admin scope).
- `get_resource` — by id or slug, full record incl. `file_path`/`external_url`.
- `list_leads` — filter by resource_id, date range, platform; paginated.
- `dashboard_stats` — totals + today's leads.
- `list_categories` — distinct categories.

Write
- `create_resource` — mirrors `upsertResource` (insert path).
- `update_resource` — mirrors `upsertResource` (update path); supports publish/unpublish via `status`.
- `delete_resource` — mirrors `deleteResource` (removes storage file).
- `create_signed_url` — generate a signed URL for a resource's file for preview.

Not exposed (out of scope for MVP)
- File uploads to storage (MCP tool timeout risk; keep in admin UI).
- Lead capture (already public via the site; not useful to Claude).

Each tool handler:
1. Uses `ctx.getToken()` + `ctx.getUserId()` from `@lovable.dev/mcp-js`.
2. Builds a per-request Supabase client with `Authorization: Bearer <token>` so RLS runs as the OAuth user.
3. Verifies `has_role(userId, 'admin')` before any read/write. Non-admins get a permission error.

## Implementation steps

1. **Add dependencies** — `bun add @lovable.dev/mcp-js zod`; whitelist `@lovable.dev/mcp-js` in `bunfig.toml` `minimumReleaseAgeExcludes`.
2. **Vite plugin** — add `mcpPlugin()` from `@lovable.dev/mcp-js/stacks/tanstack/vite` to `vite.config.ts`. This auto-generates `/mcp`, companion routes, and `/.well-known/oauth-protected-resource`.
3. **Activate Supabase OAuth 2.1** — call `supabase--configure_oauth_server` (enables DCR so Claude self-registers).
4. **Ensure asymmetric signing keys** — call `supabase--migrate_signing_keys` (required for OAuth ID tokens).
5. **Consent route** — `src/routes/[.]lovable.oauth.consent.tsx` (ssr:false) using `supabase.auth.oauth.getAuthorizationDetails / approve / deny`. Redirects unauth users to `/auth` preserving the consent URL through password/OAuth sign-in.
6. **Update `/auth`** — consume `next` search param after email login, Google `redirect_uri`, and signup `emailRedirectTo` to return to consent URL.
7. **MCP entry** — `src/lib/mcp/index.ts` with `defineMcp({ name, title, version, instructions, auth: auth.oauth.issuer({ issuer: https://${VITE_SUPABASE_PROJECT_ID}.supabase.co/auth/v1, acceptedAudiences: 'authenticated' }), tools: [...] })`.
8. **Tool files** — one per tool under `src/lib/mcp/tools/`, each Zod-validated, admin-gated, RLS-scoped.
9. **Manifest** — run `app_mcp_server--extract_mcp_manifest` after tools are saved.
10. **Favicon** — add a simple Dock favicon if missing so the connector card looks correct.

## Technical notes

- OAuth issuer must be the direct `supabase.co` host, built from `import.meta.env.VITE_SUPABASE_PROJECT_ID` (not `SUPABASE_URL`, which becomes the `.lovable.cloud` proxy on publish and fails RFC 8414 issuer match).
- All admin checks stay in tool handlers, not the audience claim (Supabase tokens all carry `aud: authenticated`).
- Never expose the raw `file_path`/`external_url` in unauthenticated contexts — MCP is admin-only so it's fine here, but signed URLs are still preferred for file access.
- Do NOT hand-write `src/routes/mcp.ts` or the well-known route — the Vite plugin owns them.
- Reuse existing `assertAdmin` pattern from `resources.functions.ts`.

## Out of scope

- Public/no-auth MCP variant.
- File upload tool.
- Publishing existing server fns (`upsertResource`, `deleteResource`) via REST — MCP calls Supabase directly with the OAuth user's token.
- Any changes to landing page, resource card, or lead capture UI.

## After implementation

Test flow: in Claude Desktop, add MCP server → `https://dock4free.lovable.app/mcp` → complete OAuth as admin user → verify tools appear and `list_resources` returns drafts.
