import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Filter,
  Mail,
  BarChart3,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  soon?: boolean;
};

const NAV: Item[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/leads", label: "Leads", icon: Users },
  { to: "/admin/funnels", label: "Funnels", icon: Filter },
  { to: "/admin/email", label: "Email Automation", icon: Mail, soon: true },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, soon: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, soon: true },
];

const COLLAPSE_KEY = "dock.admin.sidebar.collapsed";

export function OwnerConsole({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1"); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const displayName = useMemo(() => {
    if (!email) return "Admin";
    const local = email.split("@")[0] ?? "Admin";
    return local.charAt(0).toUpperCase() + local.slice(1);
  }, [email]);
  const initial = (displayName[0] ?? "A").toUpperCase();

  return (
    <div className="console flex min-h-screen bg-canvas text-ink">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border/60 bg-canvas/90 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/admin" className="font-serif text-xl italic tracking-tight">Dock</Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-white"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-ink/20 md:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-white transition-[width,transform] duration-300 ease-out",
          collapsed ? "md:w-[76px]" : "md:w-[264px]",
          "w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        aria-label="Owner Console navigation"
      >
        <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? "px-3" : "px-5"}`}>
          <Link to="/admin" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent font-serif text-lg italic text-accent-foreground shadow-[0_8px_20px_-10px_var(--accent)]">D</span>
            {!collapsed && (
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-serif text-xl italic tracking-tight">Dock</span>
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Owner Console</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto hidden h-8 w-8 place-items-center rounded-lg text-ink/50 transition-colors hover:bg-secondary hover:text-ink md:grid"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <li key={item.to}>
                  <Link
                    to={item.to as never}
                    search={item.to === "/admin/leads" ? ({} as never) : undefined}
                    title={collapsed ? item.label : undefined}
                    className={[
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-secondary text-ink shadow-[inset_0_0_0_1px_var(--border)]"
                        : "text-ink/65 hover:bg-secondary/60 hover:text-ink",
                      collapsed ? "justify-center px-0" : "",
                    ].join(" ")}
                  >
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
                    )}
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-accent" : ""}`} />
                    {!collapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.soon && (
                          <span className="ml-auto shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-accent">
                            Soon
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-3">
          <div className={`flex items-center gap-3 rounded-xl px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {initial}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{displayName}</p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Administrator</p>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink/65 transition-colors hover:bg-secondary hover:text-ink ${collapsed ? "justify-center px-0" : ""}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main
        className={[
          "min-w-0 flex-1 pt-14 transition-[padding] duration-300 md:pt-0",
          collapsed ? "md:pl-[76px]" : "md:pl-[264px]",
        ].join(" ")}
      >
        {children}
      </main>
    </div>
  );
}