import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OwnerConsole } from "@/components/admin/owner-console";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>("");
  const navigate = useNavigate();

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
    return <div className="grid min-h-screen place-items-center bg-canvas text-sm text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="max-w-md text-center">
          <p className="eyebrow mb-4">Access pending</p>
          <h1 className="font-serif text-4xl">You need admin access.</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            You're signed in as <span className="font-medium">{email}</span> but this account has no admin role yet.
          </p>
          <div className="mt-8 flex justify-center gap-2">
            <button onClick={signOut} className="rounded-full border border-border bg-white px-4 py-2 text-sm hover:bg-secondary">Sign out</button>
            <Link to="/" className="rounded-full bg-ink px-4 py-2 text-sm text-primary-foreground hover:opacity-90">Go home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OwnerConsole>
      <Outlet />
    </OwnerConsole>
  );
}
