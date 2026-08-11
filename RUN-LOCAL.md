# Running Dock locally (Windows)

A one-step way to run the app on your machine to check design and functionality
before pushing to Lovable.

## Quick start

**Double-click `run-local.bat`** (or right-click `run-local.ps1` → Run with PowerShell).

The first run installs dependencies (a few minutes); later runs start instantly.
When it says *ready*, open:

- **App:** http://localhost:5173
- **Console (CRM):** http://localhost:5173/admin/funnels — you'll be sent to the
  login page first. Sign in with your admin email + password to reach the
  Dashboard, Leads and Funnels.

Press **Ctrl+C** in the window to stop the server.

## Why a special config?

The normal build (`npm run build` / `npm run dev`) crashes on Windows because of a
path bug in the Lovable MCP vite plugin (`@lovable.dev/mcp-js`). `run-local.bat`
uses **`vite.local.config.ts`**, which is identical to the real config but without
that one plugin (it only powers Lovable's MCP endpoints, not the app itself).

**This changes nothing for Lovable** — the cloud build keeps using `vite.config.ts`.
`vite.local.config.ts` is local-only.

## Manual command (if you prefer the terminal)

```bash
npm install
npx vite dev --config vite.local.config.ts --port 5173
```

## Notes

- Data comes from your live Supabase project (values in `.env`), so the local app
  shows the same leads/funnels as production.
- Because it's the live database, treat deletes/edits as real.
- **Don't commit `src/routeTree.gen.ts` after running locally.** The dev server
  regenerates it and may reorder the lines; Lovable regenerates it its own way, so
  committing the local version just creates churn. If `git status` shows it changed,
  run `git checkout -- src/routeTree.gen.ts` before committing.
