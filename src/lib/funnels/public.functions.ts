import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public (unauthenticated) funnel submit. The browser sends raw answers +
 * contact only; the server recomputes the score and financials, so tampered
 * client values are irrelevant. Custom "other" text is captured as answer keys.
 */
const JsonVal: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonVal),
    z.record(z.string(), JsonVal),
  ]),
);

const ContactSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(120),
  last_name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(60).optional(),
  company: z.string().trim().max(200).optional(),
  website: z.string().trim().max(400).optional(),
  job_title: z.string().trim().max(160).optional(),
});

const SubmitSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  answers: z.record(z.string(), JsonVal).default({}),
  contact: ContactSchema,
  sessionId: z.string().max(80).optional(),
  meta: z
    .object({
      device: z.string().max(40).optional(),
      referrer: z.string().max(500).optional(),
      source: z.string().max(200).optional(),
      durationMs: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export const submitFunnel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitSchema.parse(d))
  .handler(async ({ data }) => {
    const m = await import("./submit.server");
    return m.handleFunnelSubmit(data as Parameters<typeof m.handleFunnelSubmit>[0]);
  });
