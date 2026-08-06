import welcome from "@/assets/rr-guide-welcome.png";
import thinking from "@/assets/rr-guide-thinking.png";
import encourage from "@/assets/rr-guide-encourage.png";
import concern from "@/assets/rr-guide-concern.png";

export type GuidePose = "welcome" | "thinking" | "encourage" | "concern";

const POSES: Record<GuidePose, string> = { welcome, thinking, encourage, concern };

type Props = {
  pose?: GuidePose;
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Render the message as a speech bubble beside the guide. */
  bubble?: boolean;
};

export function Guide({ pose = "welcome", message, size = "md", className = "", bubble = false }: Props) {
  const dim = size === "lg" ? "h-40 w-40" : size === "sm" ? "h-16 w-16" : "h-24 w-24";
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <img
        key={pose}
        src={POSES[pose]}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={768}
        height={768}
        className={`${dim} shrink-0 animate-in fade-in zoom-in-95 object-contain duration-700 motion-safe:[animation-duration:700ms]`}
      />
      {message && bubble ? (
        <p
          key={message}
          className="relative max-w-sm animate-in fade-in slide-in-from-left-1 rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-3 text-sm leading-relaxed text-ink duration-500"
        >
          {message}
        </p>
      ) : message ? (
        <p key={message} className="animate-in fade-in slide-in-from-bottom-1 max-w-sm text-sm italic leading-relaxed text-muted-foreground duration-500">
          {message}
        </p>
      ) : null}
    </div>
  );
}