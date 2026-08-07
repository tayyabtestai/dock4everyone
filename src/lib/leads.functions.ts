import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const PlatformEnum = z.enum([
  "LinkedIn", "Facebook", "Instagram", "Threads", "Reddit",
  "X", "YouTube", "Website", "Other",
]);

const LeadInput = z.object({
  resource_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  platform: PlatformEnum,
});

type UnlockedResource = {
  id: string;
  slug: string;
  title: string;
  resource_type: "pdf" | "image" | "video" | "github" | "drive" | "website";
  button_text: string;
  access_url: string;
};

function parseUA(ua: string) {
  const uaLower = ua.toLowerCase();
  let browser = "Unknown";
  if (uaLower.includes("edg/")) browser = "Edge";
  else if (uaLower.includes("chrome/") && !uaLower.includes("chromium")) browser = "Chrome";
  else if (uaLower.includes("firefox/")) browser = "Firefox";
  else if (uaLower.includes("safari/") && !uaLower.includes("chrome")) browser = "Safari";
  let device = "Desktop";
  if (/mobile|iphone|android/i.test(ua)) device = "Mobile";
  else if (/ipad|tablet/i.test(ua)) device = "Tablet";
  return { browser, device };
}

/**
 * Capture a lead and immediately return the unlocked resource access url.
 * File-based resources get a short-lived signed URL; URL-based resources
 * return the external destination. Real URLs never leave the server otherwise.
 */
export const captureLeadAndUnlock = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => LeadInput.parse(data))
  .handler(async ({ data }): Promise<UnlockedResource> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: resource, error: rErr } = await supabaseAdmin
      .from("resources")
      .select("id, slug, title, resource_type, button_text, file_path, external_url, status")
      .eq("id", data.resource_id)
      .maybeSingle();

    if (rErr || !resource) throw new Error("Resource not available");
    if (resource.status !== "published") throw new Error("Resource is not published");

    // Capture request metadata
    let ip: string | null = null;
    let ua = "";
    try {
      const req = getRequest();
      ua = req.headers.get("user-agent") ?? "";
      ip =
        req.headers.get("cf-connecting-ip") ??
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        null;
    } catch { /* SSR-only helper */ }
    const { browser, device } = parseUA(ua);

    const { upsertLeadAndLogActivity } = await import("@/lib/leads.server");
    await upsertLeadAndLogActivity(
      {
        resource_id: resource.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        platform: data.platform,
        ip_address: ip,
        user_agent: ua || null,
        browser,
        device,
      },
      { kind: "resource", metadata: { resource_slug: resource.slug, resource_title: resource.title } },
    );

    // Resolve access url
    let access_url = "";
    if (resource.resource_type === "pdf" || resource.resource_type === "image" || resource.resource_type === "video") {
      if (!resource.file_path) throw new Error("Resource file missing");
      const { data: signed, error: sErr } = await supabaseAdmin
        .storage.from("resources")
        .createSignedUrl(resource.file_path, 60 * 60); // 1 hour
      if (sErr || !signed?.signedUrl) throw new Error("Could not generate access link");
      access_url = signed.signedUrl;
    } else {
      if (!resource.external_url) throw new Error("Resource link missing");
      access_url = resource.external_url;
    }

    return {
      id: resource.id,
      slug: resource.slug,
      title: resource.title,
      resource_type: resource.resource_type,
      button_text: resource.button_text,
      access_url,
    };
  });
