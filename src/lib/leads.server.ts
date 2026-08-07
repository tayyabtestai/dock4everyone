import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type LeadIdentity = {
  full_name: string;
  email: string;
  phone?: string | null;
  platform: string;
  resource_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  browser?: string | null;
  device?: string | null;
};

export type ActivityInput = {
  kind: "resource" | "calculator";
  calculator_slug?: string | null;
  submission_id?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * One person = one row in `leads`, matched on the normalised email address.
 * Every capture is still recorded in `lead_activity` so the dashboard can show
 * repeat visits without duplicating the email list.
 */
export async function upsertLeadAndLogActivity(
  identity: LeadIdentity,
  activity: ActivityInput,
): Promise<{ leadId: string; isReturning: boolean }> {
  const email = identity.email.trim().toLowerCase();
  const name = identity.full_name.trim();

  const { data: existing } = await supabaseAdmin
    .from("leads")
    .select("id, full_name, phone")
    .eq("email", email)
    .maybeSingle();

  let leadId: string;
  const isReturning = Boolean(existing);

  if (existing) {
    leadId = existing.id;
    // Backfill only missing details; never duplicate the person.
    const patch: { full_name?: string; phone?: string } = {};
    if (!existing.full_name && name) patch.full_name = name;
    if (!existing.phone && identity.phone) patch.phone = identity.phone;
    if (Object.keys(patch).length) {
      await supabaseAdmin.from("leads").update(patch).eq("id", leadId);
    }
  } else {
    const { data: created, error } = await supabaseAdmin
      .from("leads")
      .insert({
        resource_id: identity.resource_id ?? null,
        full_name: name || email,
        email,
        phone: identity.phone || null,
        platform: identity.platform,
        ip_address: identity.ip_address ?? null,
        user_agent: identity.user_agent ?? null,
        browser: identity.browser ?? null,
        device: identity.device ?? null,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not save your details");
    leadId = created.id;
  }

  await supabaseAdmin.from("lead_activity").insert({
    lead_id: leadId,
    resource_id: identity.resource_id ?? null,
    calculator_slug: activity.calculator_slug ?? null,
    submission_id: activity.submission_id ?? null,
    kind: activity.kind,
    full_name: name || null,
    email,
    phone: identity.phone || null,
    platform: identity.platform,
    ip_address: identity.ip_address ?? null,
    user_agent: identity.user_agent ?? null,
    browser: identity.browser ?? null,
    device: identity.device ?? null,
    metadata: (activity.metadata ?? {}) as never,
  });

  return { leadId, isReturning };
}
