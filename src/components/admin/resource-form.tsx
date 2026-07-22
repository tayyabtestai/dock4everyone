import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { upsertResource } from "@/lib/resources.functions";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

const TYPES = ["pdf", "image", "video", "github", "drive", "website"] as const;
type ResourceType = (typeof TYPES)[number];

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  description: z.string().max(2000),
  category: z.string().trim().min(1).max(80),
  thumbnail_url: z.string().url().optional().or(z.literal("")),
  resource_type: z.enum(TYPES),
  button_text: z.string().trim().min(1).max(60),
  status: z.enum(["draft", "published"]),
  external_url: z.string().url().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export function ResourceForm({ mode, initial }: {
  mode: "create" | "edit";
  initial?: Partial<FormValues> & { id?: string; file_path?: string | null };
}) {
  const navigate = useNavigate();
  const upsert = useServerFn(upsertResource);
  const [filePath, setFilePath] = useState<string>(initial?.file_path ?? "");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      description: initial?.description ?? "",
      category: initial?.category ?? "General",
      thumbnail_url: initial?.thumbnail_url ?? "",
      resource_type: (initial?.resource_type as ResourceType) ?? "pdf",
      button_text: initial?.button_text ?? "Get Resource",
      status: (initial?.status as any) ?? "draft",
      external_url: initial?.external_url ?? "",
    },
  });

  const resourceType = watch("resource_type");
  const title = watch("title");
  const isFile = ["pdf", "image", "video"].includes(resourceType);

  function autoSlug() {
    const s = (title || "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 100);
    if (s) setValue("slug", s, { shouldValidate: true });
  }

  async function handleUpload(file: File, folder: "thumbs" | "files"): Promise<string> {
    const ext = file.name.split(".").pop() ?? "bin";
    const key = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("resources").upload(key, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return key;
  }

  async function onThumbChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingThumb(true);
    try {
      const key = await handleUpload(file, "thumbs");
      // Get public URL by creating a long-lived signed URL - but bucket is private,
      // so we store the signed URL for thumbnails (24h) - actually thumbnails should be publicly viewable.
      // Simplest: sign for 10 years.
      const { data } = await supabase.storage.from("resources").createSignedUrl(key, 60 * 60 * 24 * 365 * 10);
      if (data?.signedUrl) setValue("thumbnail_url", data.signedUrl, { shouldValidate: true });
      toast.success("Thumbnail uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploadingThumb(false); }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingFile(true);
    try {
      const key = await handleUpload(file, "files");
      setFilePath(key);
      toast.success("File uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploadingFile(false); }
  }

  async function onSubmit(values: FormValues) {
    if (isFile && !filePath) {
      toast.error("Please upload a file for this resource type");
      return;
    }
    if (!isFile && !values.external_url) {
      toast.error("Please add the destination URL");
      return;
    }
    try {
      await upsert({
        data: {
          ...values,
          id: initial?.id,
          file_path: isFile ? filePath : "",
          external_url: isFile ? "" : (values.external_url ?? ""),
        },
      });
      toast.success(mode === "create" ? "Resource created" : "Resource updated");
      navigate({ to: "/admin/resources" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-border md:p-8">
      <Field label="Title" error={errors.title?.message}>
        <input type="text" {...register("title")} onBlur={() => { if (!watch("slug")) autoSlug(); }} className={input} />
      </Field>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Slug" error={errors.slug?.message}>
          <input type="text" {...register("slug")} className={input} placeholder="example-slug" />
        </Field>
        <Field label="Category" error={errors.category?.message}>
          <input type="text" {...register("category")} className={input} />
        </Field>
      </div>
      <Field label="Description" error={errors.description?.message}>
        <textarea rows={4} {...register("description")} className={`${input} resize-none`} />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Resource type" error={errors.resource_type?.message}>
          <select {...register("resource_type")} className={input}>
            {TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
        </Field>
        <Field label="Button text" error={errors.button_text?.message}>
          <input type="text" {...register("button_text")} className={input} />
        </Field>
      </div>

      <Field label="Thumbnail" error={errors.thumbnail_url?.message}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm hover:bg-secondary">
            {uploadingThumb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploadingThumb ? "Uploading…" : "Upload image"}
            <input type="file" accept="image/*" className="hidden" onChange={onThumbChange} disabled={uploadingThumb} />
          </label>
          {watch("thumbnail_url") && (
            <img src={watch("thumbnail_url")} alt="Thumbnail preview" className="h-16 w-24 rounded-md border border-border object-cover" />
          )}
        </div>
      </Field>

      {isFile ? (
        <Field label={`${resourceType.toUpperCase()} file`}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm hover:bg-secondary">
              {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingFile ? "Uploading…" : filePath ? "Replace file" : "Upload file"}
              <input
                type="file"
                accept={resourceType === "pdf" ? "application/pdf" : resourceType === "image" ? "image/*" : "video/*"}
                className="hidden" onChange={onFileChange} disabled={uploadingFile}
              />
            </label>
            {filePath && <span className="truncate text-xs text-muted-foreground">{filePath}</span>}
          </div>
        </Field>
      ) : (
        <Field
          label={
            resourceType === "github" ? "GitHub repository URL"
            : resourceType === "drive" ? "Google Drive URL"
            : "Website URL"
          }
          error={errors.external_url?.message}
        >
          <input type="url" {...register("external_url")} placeholder="https://…" className={input} />
        </Field>
      )}

      <Field label="Status">
        <div className="flex gap-4">
          {(["draft", "published"] as const).map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" value={s} {...register("status")} />
              <span className="capitalize">{s}</span>
            </label>
          ))}
        </div>
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-6">
        <button type="button" onClick={() => navigate({ to: "/admin/resources" })} className="rounded-full border border-border bg-white px-4 py-2 text-sm hover:bg-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-accent disabled:opacity-60">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create resource" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

const input =
  "w-full rounded-lg bg-secondary px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accent/30";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
