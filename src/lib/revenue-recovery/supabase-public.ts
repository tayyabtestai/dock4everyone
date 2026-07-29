import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function createPublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const isNewFormat = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined as never },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (isNewFormat && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}