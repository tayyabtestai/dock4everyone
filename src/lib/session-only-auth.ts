import { supabase } from "@/integrations/supabase/client";

// Make the Supabase session behave like a browser-session cookie:
// - sessionStorage flag is set once the user signs in
// - if the app loads and finds a persisted session in localStorage but no
//   sessionStorage flag (i.e. the browser was fully closed and reopened),
//   the user is signed out and must re-authenticate.
// - while the browser stays open (new tabs, navigations, reloads), the
//   session is reused and no re-login is required.
const FLAG = "dock.session.alive";

export function installSessionOnlyAuth() {
  if (typeof window === "undefined") return;

  // On boot: if there's a persisted session but no in-browser flag, drop it.
  supabase.auth.getSession().then(({ data }) => {
    const alive = sessionStorage.getItem(FLAG);
    if (data.session && !alive) {
      supabase.auth.signOut();
    } else if (data.session && alive) {
      // keep flag fresh
      sessionStorage.setItem(FLAG, "1");
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || (session && event === "TOKEN_REFRESHED")) {
      sessionStorage.setItem(FLAG, "1");
    }
    if (event === "SIGNED_OUT") {
      sessionStorage.removeItem(FLAG);
    }
  });
}