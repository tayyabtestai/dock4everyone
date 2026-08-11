/**
 * Public funnel data access (client-safe). Anonymous visitors can read a
 * published funnel only through the `rr_get_published_by_slug` RPC (granted to
 * anon), which returns a self-contained version snapshot. Events are logged
 * fire-and-forget via the anon client (RLS allows inserts for published funnels).
 */
import { supabase } from "@/integrations/supabase/client";
import type { FunnelSnapshot } from "./engine";

export type PublicFunnel = {
  calculatorId: string;
  versionId: string | null;
  version: number | null;
  snapshot: FunnelSnapshot;
};

export type FunnelEventName =
  | "viewed"
  | "started"
  | "question_answered"
  | "abandoned"
  | "contact_gate_viewed"
  | "contact_submitted"
  | "completed"
  | "result_viewed"
  | "cta_clicked"
  | "calendly_clicked"
  | "recommendation_clicked";

/** Fetch the published funnel by slug, or null if not published / not found. */
export async function fetchPublishedFunnel(slug: string): Promise<PublicFunnel | null> {
  const { data, error } = await supabase.rpc("rr_get_published_by_slug", { _slug: slug });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const snapshot = row.snapshot as unknown as FunnelSnapshot | null;
  if (!snapshot || !Array.isArray(snapshot.questions)) return null;
  return {
    calculatorId: row.calculator_id,
    versionId: row.version_id ?? null,
    version: row.version ?? null,
    snapshot,
  };
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (/mobile|iphone|android/i.test(ua)) return "Mobile";
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}

let _sessionId: string | null = null;
/** A stable per-visit id for grouping this session's events. */
export function funnelSessionId(): string {
  if (_sessionId) return _sessionId;
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `s_${Math.floor(performance.now())}_${performance.now()}`;
  _sessionId = rand;
  return _sessionId;
}

/** Log a funnel event. Fire-and-forget: never blocks or throws to the UI. */
export function logFunnelEvent(
  calculatorId: string,
  slug: string,
  event: FunnelEventName,
  extra?: { industry?: string | null; payload?: Record<string, unknown> },
): void {
  try {
    // The Supabase query builder is lazy — it only sends the request when
    // .then() is invoked. Call it explicitly and swallow any result/error so
    // analytics never blocks or breaks the funnel.
    supabase
      .from("rr_events")
      .insert({
        calculator_id: calculatorId,
        slug,
        session_id: funnelSessionId(),
        event,
        payload: (extra?.payload ?? {}) as never,
        industry: extra?.industry ?? null,
        device: detectDevice(),
        source: typeof document !== "undefined" ? document.referrer || null : null,
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    /* analytics must never break the funnel */
  }
}
