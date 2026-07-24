import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthClient = { name?: string; client_name?: string };
type AuthDetails = {
  client?: OAuthClient;
  redirect_url?: string;
  redirect_to?: string;
  scopes?: string[] | string;
};

// Local typed wrapper — the auth.oauth namespace is beta and may not be in types.
function oauth() {
  return (supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails(id: string): Promise<{ data: AuthDetails | null; error: Error | null }>;
      approveAuthorization(id: string): Promise<{ data: AuthDetails | null; error: Error | null }>;
      denyAuthorization(id: string): Promise<{ data: AuthDetails | null; error: Error | null }>;
    };
  }).oauth;
}

function safeNext(raw: string): string {
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const params = new URLSearchParams(location.search);
    const authorizationId = params.get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-serif text-2xl">Authorization error</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as AuthDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? details?.client?.client_name ?? "an application";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect URL returned."); return; }
    window.location.href = target;
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <p className="eyebrow mb-4">Connect</p>
      <h1 className="font-serif text-3xl leading-tight">
        Connect {clientName} to Dock
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {clientName} will be able to call Dock's admin tools while you are signed in.
        This does not bypass Dock's permissions — the connection acts as you.
      </p>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={() => decide(true)}
          disabled={busy}
          className="rounded-lg bg-ink py-3 text-sm font-medium text-primary-foreground hover:bg-accent disabled:opacity-60"
        >
          Approve connection
        </button>
        <button
          onClick={() => decide(false)}
          disabled={busy}
          className="rounded-lg bg-secondary py-3 text-sm text-ink ring-1 ring-border hover:bg-white disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </main>
  );
}

// silence unused import lint
void safeNext;
