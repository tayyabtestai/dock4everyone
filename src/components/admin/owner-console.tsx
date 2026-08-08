import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Leaf = { to: string; label: string };
type Item =
  | { kind: "leaf"; to: string; label: string; icon: React.ComponentType<{ className?: string }> }
  | { kind: "group"; key: string; label: string; icon: React.ComponentType<{ className?: string }>; to?: string; children: Leaf[] };

const NAV: Item[] = [
  { kind: "leaf", to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { kind: "leaf", to: "/admin/leads", label: "Leads", icon: Users },
];

const COLLAPSE_KEY = "dock.admin.sidebar.collapsed";
const OPEN_KEY = "dock.admin.sidebar.open-groups";

export function OwnerConsole({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  // hydrate from localStorage
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
      const raw = localStorage.getItem(OPEN_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      // auto-open the group containing the active path
      const active: Record<string, boolean> = { ...parsed };
      for (const item of NAV) {
        if (item.kind === "group" && item.children.some((c) => isActive(c.to, pathname))) {
          active[item.key] = true;
        }
      }
      setOpenGroups(active);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);
  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(openGroups)); } catch {}
  }, [openGroups]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    (async () => {
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
    <div className="flex min-h-screen bg-canvas text-ink">
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

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-white transition-[width,transform] duration-300 ease-out",
          collapsed ? "md:w-[72px]" : "md:w-[260px]",
          "w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        aria-label="Owner Console navigation"
      >
        {/* Brand */}
        <div className={`flex items-center gap-3 border-b border-border ${collapsed ? "px-3 py-5" : "px-5 py-5"}`}>
          <Link to="/admin" className="flex items-center gap-3 min-w-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ink font-serif text-lg italic text-primary-foreground">D</span>
            {!collapsed && (
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-serif text-xl italic tracking-tight">Dock</span>
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Owner Console</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto hidden h-8 w-8 place-items-center rounded-md text-ink/60 hover:bg-secondary hover:text-ink md:grid"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.kind === "leaf" ? item.to : item.key}>
                {item.kind === "leaf" ? (
                  <NavLeaf to={item.to} label={item.label} icon={item.icon} pathname={pathname} collapsed={collapsed} exact={item.to === "/admin"} />
                ) : (
                  <NavGroup
                    item={item}
                    pathname={pathname}
                    collapsed={collapsed}
                    open={!!openGroups[item.key]}
                    onToggle={() => setOpenGroups((s) => ({ ...s, [item.key]: !s[item.key] }))}
                  />
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer / profile */}
        <div className="border-t border-border p-3">
          <div className={`flex items-center gap-3 rounded-md px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-primary-foreground">
              {initial}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{displayName}</p>
                <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">Administrator</p>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className={`mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink/70 hover:bg-secondary hover:text-ink ${collapsed ? "justify-center px-0" : ""}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main
        className={[
          "flex-1 pt-14 transition-[padding] duration-300 md:pt-0",
          collapsed ? "md:pl-[72px]" : "md:pl-[260px]",
        ].join(" ")}
      >
        {children}
      </main>
    </div>
  );
}

function isActive(to: string, pathname: string, exact = false) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(to + "/");
}

function NavLeaf({
  to, label, icon: Icon, pathname, collapsed, exact,
}: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; pathname: string; collapsed: boolean; exact?: boolean }) {
  const active = isActive(to, pathname, exact);
  return (
    <Link
      to={to as never}
      title={collapsed ? label : undefined}
      className={[
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-secondary text-ink" : "text-ink/70 hover:bg-secondary hover:text-ink",
        collapsed ? "justify-center px-0" : "",
      ].join(" ")}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function NavGroup({
  item, pathname, collapsed, open, onToggle,
}: {
  item: Extract<Item, { kind: "group" }>;
  pathname: string;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = item.icon;
  const anyChildActive = item.children.some((c) => isActive(c.to, pathname));
  const showOpen = open || anyChildActive;

  if (collapsed) {
    // In collapsed mode: render group as a single icon linking to primary child or overview
    const target = item.to ?? item.children[0].to;
    return (
      <Link
        to={target as never}
        title={item.label}
        className={[
          "flex items-center justify-center rounded-md px-0 py-2 text-sm font-medium",
          anyChildActive ? "bg-secondary text-ink" : "text-ink/70 hover:bg-secondary hover:text-ink",
        ].join(" ")}
      >
        <Icon className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={showOpen}
        className={[
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          anyChildActive ? "text-ink" : "text-ink/70 hover:bg-secondary hover:text-ink",
        ].join(" ")}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${showOpen ? "rotate-0" : "-rotate-90"}`} />
      </button>
      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out ${showOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <ul className="min-h-0 space-y-0.5 pb-1 pl-8 pr-1 pt-1">
          {item.children.map((c) => {
            const active = isActive(c.to, pathname);
            return (
              <li key={c.to}>
                <Link
                  to={c.to as never}
                  className={[
                    "block rounded-md px-3 py-1.5 text-[13px] transition-colors",
                    active ? "bg-secondary font-medium text-ink" : "text-ink/60 hover:bg-secondary hover:text-ink",
                  ].join(" ")}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
