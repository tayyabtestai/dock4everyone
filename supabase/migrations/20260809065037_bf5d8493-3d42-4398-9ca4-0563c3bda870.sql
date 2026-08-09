ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS mobile_phone text,
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS company_domain text,
  ADD COLUMN IF NOT EXISTS company_phone text,
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS seniority text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS company_linkedin text,
  ADD COLUMN IF NOT EXISTS company_linkedin_uid text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS employees_count integer,
  ADD COLUMN IF NOT EXISTS company_annual_revenue text,
  ADD COLUMN IF NOT EXISTS company_revenue_clean numeric,
  ADD COLUMN IF NOT EXISTS company_seo_description text,
  ADD COLUMN IF NOT EXISTS company_short_description text,
  ADD COLUMN IF NOT EXISTS company_total_funding text,
  ADD COLUMN IF NOT EXISTS company_total_funding_clean numeric,
  ADD COLUMN IF NOT EXISTS company_technologies text,
  ADD COLUMN IF NOT EXISTS email_domain text,
  ADD COLUMN IF NOT EXISTS keywords text,
  ADD COLUMN IF NOT EXISTS person_id text,
  ADD COLUMN IF NOT EXISTS company_id text,
  ADD COLUMN IF NOT EXISTS company_logo text,
  ADD COLUMN IF NOT EXISTS personal_photo text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS company_twitter text,
  ADD COLUMN IF NOT EXISTS company_facebook text,
  ADD COLUMN IF NOT EXISTS company_founded_year integer,
  ADD COLUMN IF NOT EXISTS company_city text,
  ADD COLUMN IF NOT EXISTS company_state text,
  ADD COLUMN IF NOT EXISTS company_country text,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS leads_person_id_idx ON public.leads (person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_company_id_idx ON public.leads (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);

CREATE TABLE IF NOT EXISTS public.lead_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_saved_views TO authenticated;
GRANT ALL ON public.lead_saved_views TO service_role;

ALTER TABLE public.lead_saved_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage saved views" ON public.lead_saved_views;
CREATE POLICY "admins manage saved views"
  ON public.lead_saved_views FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));