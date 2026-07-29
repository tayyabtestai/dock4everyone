
-- =========================================
-- Revenue Recovery Platform schema
-- =========================================

CREATE TYPE public.rr_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE public.rr_question_type AS ENUM (
  'single_choice',
  'multi_choice',
  'number',
  'currency',
  'percentage',
  'slider',
  'rating',
  'yes_no',
  'short_text',
  'long_text'
);

-- ---------- rr_calculators ----------
CREATE TABLE public.rr_calculators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  outcome text NOT NULL DEFAULT '',
  status public.rr_status NOT NULL DEFAULT 'draft',
  industries text[] NOT NULL DEFAULT ARRAY[]::text[],
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_version integer,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rr_calculators TO authenticated;
GRANT ALL ON public.rr_calculators TO service_role;

ALTER TABLE public.rr_calculators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rr_calculators admin all" ON public.rr_calculators
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER rr_calculators_updated_at
  BEFORE UPDATE ON public.rr_calculators
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- rr_calculator_versions ----------
CREATE TABLE public.rr_calculator_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_id uuid NOT NULL REFERENCES public.rr_calculators(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculator_id, version)
);

CREATE INDEX rr_versions_calc_idx ON public.rr_calculator_versions (calculator_id, version DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rr_calculator_versions TO authenticated;
GRANT ALL ON public.rr_calculator_versions TO service_role;

ALTER TABLE public.rr_calculator_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rr_versions admin all" ON public.rr_calculator_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- rr_questions ----------
CREATE TABLE public.rr_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_id uuid NOT NULL REFERENCES public.rr_calculators(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  section text,
  industry text,
  type public.rr_question_type NOT NULL,
  key text NOT NULL,
  label text NOT NULL DEFAULT '',
  help text NOT NULL DEFAULT '',
  tooltip text NOT NULL DEFAULT '',
  insight text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT false,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  weight numeric NOT NULL DEFAULT 0,
  scoring jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculator_id, key, industry)
);

CREATE INDEX rr_questions_calc_idx ON public.rr_questions (calculator_id, order_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rr_questions TO authenticated;
GRANT ALL ON public.rr_questions TO service_role;

ALTER TABLE public.rr_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rr_questions admin all" ON public.rr_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER rr_questions_updated_at
  BEFORE UPDATE ON public.rr_questions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- rr_scoring_rules ----------
CREATE TABLE public.rr_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_id uuid NOT NULL REFERENCES public.rr_calculators(id) ON DELETE CASCADE,
  industry text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculator_id, industry)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rr_scoring_rules TO authenticated;
GRANT ALL ON public.rr_scoring_rules TO service_role;

ALTER TABLE public.rr_scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rr_scoring admin all" ON public.rr_scoring_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER rr_scoring_updated_at
  BEFORE UPDATE ON public.rr_scoring_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- rr_recommendations ----------
CREATE TABLE public.rr_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_id uuid NOT NULL REFERENCES public.rr_calculators(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  industry text,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  triggers jsonb NOT NULL DEFAULT '{}'::jsonb,
  cta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rr_recs_calc_idx ON public.rr_recommendations (calculator_id, order_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rr_recommendations TO authenticated;
GRANT ALL ON public.rr_recommendations TO service_role;

ALTER TABLE public.rr_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rr_recs admin all" ON public.rr_recommendations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER rr_recs_updated_at
  BEFORE UPDATE ON public.rr_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- rr_submissions ----------
CREATE TABLE public.rr_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_id uuid NOT NULL REFERENCES public.rr_calculators(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.rr_calculator_versions(id) ON DELETE SET NULL,
  slug text NOT NULL,
  industry text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  financial_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  device text,
  traffic_source text,
  referrer text,
  session_id text,
  duration_ms integer,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rr_submissions_calc_idx ON public.rr_submissions (calculator_id, completed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rr_submissions TO authenticated;
GRANT INSERT ON public.rr_submissions TO anon;
GRANT ALL ON public.rr_submissions TO service_role;

ALTER TABLE public.rr_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rr_submissions admin all" ON public.rr_submissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- rr_events ----------
CREATE TABLE public.rr_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_id uuid REFERENCES public.rr_calculators(id) ON DELETE CASCADE,
  slug text NOT NULL,
  session_id text,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  industry text,
  device text,
  source text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rr_events_calc_idx ON public.rr_events (calculator_id, created_at DESC);
CREATE INDEX rr_events_slug_idx ON public.rr_events (slug, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rr_events TO authenticated;
GRANT INSERT ON public.rr_events TO anon;
GRANT ALL ON public.rr_events TO service_role;

ALTER TABLE public.rr_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rr_events admin all" ON public.rr_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- Helper functions ----------

-- Whether a calculator (by id) is currently published.
CREATE OR REPLACE FUNCTION public.rr_is_published(_calculator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rr_calculators
    WHERE id = _calculator_id AND status = 'published'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.rr_is_published(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rr_is_published(uuid) TO anon, authenticated, service_role;

-- Return the latest published snapshot for a slug (or null).
CREATE OR REPLACE FUNCTION public.rr_get_published_by_slug(_slug text)
RETURNS TABLE (
  calculator_id uuid,
  version_id uuid,
  version integer,
  key text,
  slug text,
  name text,
  tagline text,
  description text,
  industries text[],
  settings jsonb,
  snapshot jsonb,
  published_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, v.id, v.version, c.key, c.slug, c.name, c.tagline, c.description,
         c.industries, c.settings, v.snapshot, c.published_at
  FROM public.rr_calculators c
  JOIN public.rr_calculator_versions v
    ON v.calculator_id = c.id AND v.version = c.published_version
  WHERE c.slug = _slug AND c.status = 'published'
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.rr_get_published_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rr_get_published_by_slug(text) TO anon, authenticated, service_role;

-- Row-level policies allowing public inserts ONLY when the calculator is published
CREATE POLICY "rr_events public insert when published" ON public.rr_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    calculator_id IS NULL
    OR public.rr_is_published(calculator_id)
  );

CREATE POLICY "rr_submissions public insert when published" ON public.rr_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.rr_is_published(calculator_id));

-- Seed rows for the 9 existing calculators (keys match sidebar routes).
INSERT INTO public.rr_calculators (key, slug, name, tagline, description, outcome, status)
VALUES
  ('leakage','revenue-leakage','Revenue Leakage Calculator','Find every dollar quietly slipping out','Pinpoint where revenue leaves your operation and estimate the annual value of each leak.','Recover lost revenue','draft'),
  ('ai-opportunity','ai-opportunity','AI Opportunity Scanner','See which operations pay you back the fastest','Uncover the specific workflows where intelligent systems generate the highest financial return.','Prioritise the highest-impact opportunities','draft'),
  ('time-waste','time-waste','Time Waste Calculator','Turn wasted hours into recovered profit','Translate manual, repetitive work into the exact number of hours and dollars it costs each month.','Reclaim hours across your team','draft'),
  ('lead-conversion','lead-conversion','Lead Conversion Audit','Understand why prospects never become customers','Diagnose the drop-off points in your funnel and estimate the revenue you leave on the table.','Convert more of the leads you already earn','draft'),
  ('missed-calls','missed-calls','Missed Calls Calculator','Every unanswered call has a price','Calculate the annual revenue lost to missed calls, voicemails and after-hours enquiries.','Capture every inbound opportunity','draft'),
  ('appointment-recovery','appointment-recovery','Appointment Recovery Calculator','Rescue bookings before they disappear','Quantify no-shows, cancellations and rescheduling gaps and see how much of that revenue is recoverable.','Fill more of the calendar you already own','draft'),
  ('efficiency-score','business-efficiency','Business Efficiency Score','A single score that maps operational health','Benchmark day-to-day operations across time, tools, people and process to see where you truly stand.','Understand operational strength at a glance','draft'),
  ('automation-report','automation-opportunity','Automation Opportunity Report','The blueprint for what to automate first','Receive a prioritised, business-language plan for the systems that will pay for themselves fastest.','Move forward with a clear implementation path','draft'),
  ('roi','ai-roi','AI ROI Calculator','Model the true return before you commit','Project the financial impact of intelligent systems across revenue, cost and time in your own numbers.','Make investment decisions with confidence','draft');
