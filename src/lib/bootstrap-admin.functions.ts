import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// One-shot bootstrap. Creates the initial admin user only when NO admin
// exists yet. Safe to leave in the codebase: after the first successful
// call, all subsequent calls become a no-op.
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: checkErr } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if (checkErr) throw new Error(checkErr.message);
    if (existing && existing.length > 0) {
      return { ok: false as const, reason: "admin_exists" };
    }

    // Try to create the user; if already exists, look them up.
    let userId: string | undefined;
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (created.data.user) {
      userId = created.data.user.id;
    } else {
      // Fallback: find by email via listUsers (paged).
      for (let page = 1; page <= 10 && !userId; page++) {
        const list = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (list.error) throw new Error(list.error.message);
        const found = list.data.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
        if (found) userId = found.id;
        if (list.data.users.length < 200) break;
      }
      if (!userId) throw new Error(created.error?.message ?? "Could not create or find user");
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true as const, userId };
  });