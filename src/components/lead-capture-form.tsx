import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { captureLeadAndUnlock } from "@/lib/leads.functions";
import { Loader2, ExternalLink, Download } from "lucide-react";

const PLATFORMS = [
  "LinkedIn", "Facebook", "Instagram", "Threads", "Reddit",
  "X", "YouTube", "Website", "Other",
] as const;

const schema = z.object({
  full_name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(40).optional(),
  platform: z.enum(PLATFORMS),
});
type FormValues = z.infer<typeof schema>;

type Unlocked = Awaited<ReturnType<typeof captureLeadAndUnlock>>;

export function LeadCaptureForm({ resourceId }: { resourceId: string }) {
  const [unlocked, setUnlocked] = useState<Unlocked | null>(null);
  const capture = useServerFn(captureLeadAndUnlock);
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { platform: "LinkedIn" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const result = await capture({
        data: {
          resource_id: resourceId,
          full_name: values.full_name,
          email: values.email,
          phone: values.phone || "",
          platform: values.platform,
        },
      });
      setUnlocked(result);
      toast.success("Access granted", { description: "Your resource is ready." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    }
  }

  if (unlocked) {
    const isFile = ["pdf", "image", "video"].includes(unlocked.resource_type);
    return (
      <UnlockedView unlocked={unlocked} isFile={isFile} />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <Field label="Full Name" error={errors.full_name?.message}>
        <input
          type="text"
          placeholder="Jane Doe"
          {...register("full_name")}
          className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm ring-1 ring-border transition-shadow focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <input
          type="email"
          placeholder="jane@company.com"
          {...register("email")}
          className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Platform" error={errors.platform?.message}>
          <select
            {...register("platform")}
            className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Phone (optional)" error={errors.phone?.message}>
          <input
            type="tel"
            placeholder="+1 (555)"
            {...register("phone")}
            className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-3 text-sm font-medium text-primary-foreground ring-1 ring-ink transition-colors hover:bg-accent disabled:opacity-60"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Unlock Resource
      </button>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        By submitting, you agree to receive occasional updates.
      </p>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function UnlockedView({ unlocked, isFile }: { unlocked: Unlocked; isFile: boolean }) {
  const { resource_type, access_url, title } = unlocked;
  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <span className="eyebrow text-accent">Access granted</span>
      <h3 className="mt-2 font-serif text-2xl leading-tight text-ink">{title}</h3>

      {resource_type === "pdf" && (
        <div className="mt-6 space-y-4">
          <div className="aspect-[4/5] w-full overflow-hidden rounded-lg border border-border bg-secondary">
            <iframe src={access_url} title={title} className="h-full w-full" />
          </div>
          <a href={access_url} download className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      )}

      {resource_type === "image" && (
        <div className="mt-6 space-y-4">
          <img src={access_url} alt={title} className="max-h-[70vh] w-full rounded-lg border border-border object-contain" />
          <a href={access_url} download className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent">
            <Download className="h-4 w-4" /> Download
          </a>
        </div>
      )}

      {resource_type === "video" && (
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-black">
          <video src={access_url} controls className="w-full" />
        </div>
      )}

      {!isFile && (
        <div className="mt-6">
          <a
            href={access_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-accent"
          >
            {resource_type === "github" ? "Open Repository" : resource_type === "drive" ? "Open Drive" : "Open Website"}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
