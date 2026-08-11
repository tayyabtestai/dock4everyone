import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  X,
  Eye,
  Pencil,
  MoreHorizontal,
  Copy,
  Code2,
  QrCode,
  Link as LinkIcon,
} from "lucide-react";
import { adminGetFunnel } from "@/lib/funnels/admin.functions";
import {
  FUNNEL_STATUS_LABEL,
  FUNNEL_STATUS_TONE,
  industryTone,
  primaryIndustry,
  type FunnelStatus,
} from "@/lib/funnels/taxonomy";

export type FunnelAction = "preview" | "edit" | "more";

type RecentSubmission = {
  id: string;
  lead_id: string | null;
  created_at: string;
  score: number | null;
  name: string;
  business_name: string | null;
  industry: string | null;
};

function publicUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/funnel/${slug}`;
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Couldn't copy to clipboard");
  }
}

export function FunnelDetailPanel({
  id,
  onClose,
  onAction,
}: {
  id: string;
  onClose: () => void;
  onAction: (action: FunnelAction) => void;
}) {
  const getFn = useServerFn(adminGetFunnel);
  const q = useQuery({
    queryKey: ["admin", "funnel-detail", id],
    queryFn: () => getFn({ data: { id } }),
    staleTime: 5_000,
  });
  const f = q.data;
  const status = (f?.status ?? "draft") as FunnelStatus;
  const tone = FUNNEL_STATUS_TONE[status] ?? FUNNEL_STATUS_TONE.draft;
  const url = f ? publicUrl(f.slug) : "";
  const industry = primaryIndustry(f?.industries);

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          {q.isLoading ? (
            <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
          ) : (
            <>
              <h2 className="truncate font-serif text-xl leading-tight">{f?.name ?? "Funnel"}</h2>
              <span
                className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone.pill}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                {FUNNEL_STATUS_LABEL[status]}
              </span>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-ink"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-6 px-5 py-5">
        {f?.description && <p className="text-sm text-muted-foreground">{f.description}</p>}

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <PanelAction icon={Eye} label="Preview" onClick={() => onAction("preview")} />
          <PanelAction icon={Pencil} label="Edit" onClick={() => onAction("edit")} />
          <PanelAction icon={MoreHorizontal} label="More" onClick={() => onAction("more")} />
        </div>

        {/* Performance */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Performance
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <MetricTile label="Views" value={f?.stats.views} loading={q.isLoading} />
            <MetricTile label="Submissions" value={f?.stats.submissions} loading={q.isLoading} />
            <MetricTile
              label="Conversion"
              value={f ? `${f.stats.conversion}%` : undefined}
              loading={q.isLoading}
            />
            <MetricTile label="Leads" value={f?.stats.leads} loading={q.isLoading} />
          </div>
        </section>

        {/* Funnel URL */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Funnel URL
          </h3>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2">
            <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {url || "—"}
            </span>
            <button
              onClick={() => copy(url, "Funnel URL")}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg hover:bg-card"
              aria-label="Copy URL"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          {status !== "published" && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Publish this funnel to make the link live.
            </p>
          )}
        </section>

        {/* Share */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Share Funnel
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <ShareButton icon={Copy} label="Copy Link" onClick={() => copy(url, "Link")} />
            <ShareButton
              icon={Code2}
              label="Embed"
              onClick={() =>
                copy(
                  `<iframe src="${url}" width="100%" height="720" style="border:0" title="${f?.name ?? "Funnel"}"></iframe>`,
                  "Embed code",
                )
              }
            />
            <ShareButton
              icon={QrCode}
              label="QR Code"
              onClick={() => toast.info("QR export arrives with the public funnel (Phase 2c).")}
            />
          </div>
        </section>

        {/* Recent submissions */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recent Submissions
          </h3>
          {q.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-secondary" />
              ))}
            </div>
          ) : !f?.recentSubmissions.length ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              No submissions yet. They&apos;ll appear here as visitors complete the funnel.
            </p>
          ) : (
            <ul className="space-y-1">
              {(f.recentSubmissions as RecentSubmission[]).map((s) => {
                const inner = (
                  <>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">
                      {(s.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.business_name || s.industry || "—"}
                      </span>
                    </span>
                    {s.industry && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${industryTone(s.industry)}`}
                      >
                        {s.industry}
                      </span>
                    )}
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {format(new Date(s.created_at), "MMM d")}
                    </span>
                  </>
                );
                return (
                  <li key={s.id}>
                    {s.lead_id ? (
                      <Link
                        to="/admin/leads/$id"
                        params={{ id: s.lead_id }}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/60"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}

function PanelAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-2 text-xs font-medium transition-colors hover:bg-secondary"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function ShareButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card px-2 py-2.5 text-[11px] font-medium transition-colors hover:bg-secondary"
    >
      <Icon className="h-4 w-4 text-accent" /> {label}
    </button>
  );
}

function MetricTile({
  label,
  value,
  loading,
}: {
  label: string;
  value?: number | string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      {loading ? (
        <div className="mt-1 h-6 w-12 animate-pulse rounded bg-secondary" />
      ) : (
        <p className="mt-0.5 font-serif text-2xl leading-none tabular-nums">{value ?? "—"}</p>
      )}
    </div>
  );
}
