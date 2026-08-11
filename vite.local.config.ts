import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * LOCAL-ONLY dev config. Identical to vite.config.ts but without the Lovable
 * MCP plugin, which crashes on Windows (a backslash/forward-slash path bug in
 * @lovable.dev/mcp-js). The MCP plugin only serves Lovable's /.mcp endpoints,
 * so dropping it has no effect on the app's design or functionality locally.
 *
 * Lovable's cloud build keeps using vite.config.ts — this file is never used there.
 * Run it with:  npx vite dev --config vite.local.config.ts
 * or just double-click run-local.bat.
 */
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
