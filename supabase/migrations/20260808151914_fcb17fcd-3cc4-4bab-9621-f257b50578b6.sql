ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS lead_score integer,
  ADD COLUMN IF NOT EXISTS funnel_id uuid,
  ADD COLUMN IF NOT EXISTS funnel_name text,
  ADD COLUMN IF NOT EXISTS funnel_version text,
  ADD COLUMN IF NOT EXISTS funnel_response_data jsonb,
  ADD COLUMN IF NOT EXISTS funnel_result jsonb,
  ADD COLUMN IF NOT EXISTS funnel_score numeric,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.leads ALTER COLUMN platform SET DEFAULT 'Other';

CREATE INDEX IF NOT EXISTS leads_industry_idx ON public.leads (industry);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads (status);
CREATE INDEX IF NOT EXISTS leads_source_idx ON public.leads (source);
CREATE INDEX IF NOT EXISTS leads_tags_idx ON public.leads USING gin (tags);

DROP TRIGGER IF EXISTS leads_set_updated_at ON public.leads;
CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP POLICY IF EXISTS "admins can insert leads" ON public.leads;
CREATE POLICY "admins can insert leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "admins can update leads" ON public.leads;
CREATE POLICY "admins can update leads" ON public.leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.lead_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  imported_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  total_rows integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_imports TO authenticated;
GRANT ALL ON public.lead_imports TO service_role;
ALTER TABLE public.lead_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage lead imports" ON public.lead_imports;
CREATE POLICY "admins manage lead imports" ON public.lead_imports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS lead_imports_set_updated_at ON public.lead_imports;
CREATE TRIGGER lead_imports_set_updated_at BEFORE UPDATE ON public.lead_imports
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();