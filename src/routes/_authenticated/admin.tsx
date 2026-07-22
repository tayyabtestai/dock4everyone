import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, FileText, Users, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>("");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      setEmail(sess.user?.email ?? "");
      if (!uid) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  if (isAdmin === null) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="max-w-md text-center">
          <p className="eyebrow mb-4">Access pending</p>
          <h1 className="font-serif text-4xl">You need admin access.</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            You're signed in as <span className="font-medium">{email}</span> but this account has no admin role yet.
            Grant it from the Cloud users panel, then reload.
          </p>
          <div className="mt-8 flex justify-center gap-2">
            <button onClick={signOut} className="rounded-full border border-border bg-white px-4 py-2 text-sm hover:bg-secondary">Sign out</button>
            <Link to="/" className="rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground hover:bg-accent">Go home</Link>
          </div>
        </div>
      </div>
    );
  }

  const items: Array<{ to: "/admin" | "/admin/resources" | "/admin/leads"; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/resources", label: "Resources", icon: FileText },
    { to: "/admin/leads", label: "Leads", icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-white md:flex">
        <div className="border-b border-border p-6">
          <Link to="/" className="font-serif text-2xl italic tracking-tight text-ink">Dock</Link>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Owner Console</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-secondary text-ink" : "text-ink/70 hover:bg-secondary hover:text-ink"
                }`}
              >
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-3 truncate px-3 text-xs text-muted-foreground">{email}</div>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink/70 hover:bg-secondary hover:text-ink">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-white px-4 py-3 md:hidden">
        <Link to="/admin" className="font-serif text-xl italic">Dock</Link>
        <div className="flex gap-2">
          {items.map((it) => (
            <Link key={it.to} to={it.to} className="rounded-md p-2 text-ink/70 hover:bg-secondary" aria-label={it.label}>
              <it.icon className="h-4 w-4" />
            </Link>
          ))}
          <button onClick={signOut} className="rounded-md p-2 text-ink/70 hover:bg-secondary" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <main className="flex-1 pt-16 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
