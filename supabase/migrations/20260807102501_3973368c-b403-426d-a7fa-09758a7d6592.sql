-- 1. Normalise emails and de-duplicate existing leads (keep oldest per email)
UPDATE public.leads SET email = lower(trim(email));

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY lower(trim(email)) ORDER BY created_at ASC) rn
  FROM public.leads
)
UPDATE public.rr_submissions s
SET lead_id = keep.id
FROM ranked r
JOIN public.leads dup ON dup.id = r.id
JOIN public.leads keep ON lower(trim(keep.email)) = lower(trim(dup.email))
JOIN ranked kr ON kr.id = keep.id AND kr.rn = 1
WHERE r.rn > 1 AND s.lead_id = r.id;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY lower(trim(email)) ORDER BY created_at ASC) rn
  FROM public.leads
)
DELETE FROM public.leads l USING ranked r WHERE l.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique ON public.leads (lower(email));

-- 2. Activity log: every submission event, even from an existing lead
CREATE TABLE public.lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL,
  calculator_slug text,
  submission_id uuid REFERENCES public.rr_submissions(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'resource',
  full_name text,
  email text,
  phone text,
  platform text,
  ip_address text,
  user_agent text,
  browser text,
  device text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lead_activity_lead_id_idx ON public.lead_activity (lead_id);
CREATE INDEX lead_activity_created_at_idx ON public.lead_activity (created_at DESC);

GRANT SELECT ON public.lead_activity TO authenticated;
GRANT ALL ON public.lead_activity TO service_role;

ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can view lead activity" ON public.lead_activity
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins can delete lead activity" ON public.lead_activity
FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Backfill activity rows from existing leads and calculator submissions
INSERT INTO public.lead_activity (lead_id, resource_id, kind, full_name, email, phone, platform, ip_address, user_agent, browser, device, created_at)
SELECT id, resource_id, 'resource', full_name, email, phone, platform, ip_address, user_agent, browser, device, created_at
FROM public.leads;

INSERT INTO public.lead_activity (lead_id, calculator_slug, submission_id, kind, email, created_at)
SELECT s.lead_id, s.slug, s.id, 'calculator', l.email, s.created_at
FROM public.rr_submissions s JOIN public.leads l ON l.id = s.lead_id
WHERE s.lead_id IS NOT NULL;