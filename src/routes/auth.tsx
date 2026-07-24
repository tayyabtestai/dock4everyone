import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" && s.next ? { next: s.next } : {},
  head: () => ({
    meta: [
      { title: "Admin — Dock" },
      { name: "description", content: "Sign in to manage the Dock archive." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function safeNext(raw: string): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const returnTo = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (returnTo) window.location.replace(returnTo);
        else navigate({ to: "/admin", replace: true });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        if (returnTo) window.location.replace(returnTo);
        else navigate({ to: "/admin", replace: true });
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [navigate, returnTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const emailRedirectTo = returnTo
          ? window.location.origin + returnTo
          : window.location.origin + "/admin";
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo },
        });
        if (error) throw error;
        toast.success("Account created", { description: "Ask the workspace owner to grant you admin access." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-md px-6 py-16">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to Dock
        </Link>
        <p className="eyebrow mb-4">Admin</p>
        <h1 className="mb-2 font-serif text-4xl leading-tight">
          {mode === "signin" ? "Sign in to the archive." : "Create admin account."}
        </h1>
        <p className="mb-10 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Manage resources, review leads, publish new entries."
            : "New accounts require an admin role assignment before the dashboard unlocks."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-border">
          <label className="block">
            <span className="eyebrow mb-1.5 block">Email</span>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-1.5 block">Password</span>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <button
            type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-3 text-sm font-medium text-primary-foreground hover:bg-accent disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          className="mt-6 text-sm text-muted-foreground hover:text-ink"
        >
          {mode === "signin" ? "Need to create an account?" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
