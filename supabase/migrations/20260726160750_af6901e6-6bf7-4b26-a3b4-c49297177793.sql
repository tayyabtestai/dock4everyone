
-- Enum for assessment status
CREATE TYPE public.assessment_status AS ENUM ('draft', 'published', 'archived');

-- ============ assessments ============
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Untitled Assessment',
  industry text NOT NULL DEFAULT '',
  status public.assessment_status NOT NULL DEFAULT 'draft',
  headline text NOT NULL DEFAULT '',
  subheadline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  estimated_minutes int NOT NULL DEFAULT 3,
  primary_cta_label text NOT NULL DEFAULT '',
  primary_cta_url text NOT NULL DEFAULT '',
  secondary_cta_label text NOT NULL DEFAULT '',
  secondary_cta_url text NOT NULL DEFAULT '',
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  featured_image_url text NOT NULL DEFAULT '',
  og_image_url text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  formulas jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  lead_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.assessments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can view published assessments" ON public.assessments
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "admins can view all assessments" ON public.assessments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can insert assessments" ON public.assessments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can update assessments" ON public.assessments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can delete assessments" ON public.assessments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER assessments_set_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX assessments_status_idx ON public.assessments(status);
CREATE INDEX assessments_updated_at_idx ON public.assessments(updated_at DESC);

-- ============ assessment_templates ============
CREATE TABLE public.assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  formulas jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.assessment_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.assessment_templates TO authenticated;
GRANT ALL ON public.assessment_templates TO service_role;

ALTER TABLE public.assessment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view templates" ON public.assessment_templates
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admins can insert templates" ON public.assessment_templates
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can update templates" ON public.assessment_templates
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can delete templates" ON public.assessment_templates
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER assessment_templates_set_updated_at
  BEFORE UPDATE ON public.assessment_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ assessment_submissions ============
CREATE TABLE public.assessment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  landing_page text,
  referrer text,
  country text,
  device text,
  browser text,
  ip_address text,
  user_agent text,
  duration_seconds int,
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.assessment_submissions TO anon, authenticated;
GRANT SELECT, DELETE ON public.assessment_submissions TO authenticated;
GRANT ALL ON public.assessment_submissions TO service_role;

ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can view submissions" ON public.assessment_submissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anyone can insert submissions" ON public.assessment_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "admins can delete submissions" ON public.assessment_submissions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX assessment_submissions_assessment_idx ON public.assessment_submissions(assessment_id, created_at DESC);

-- ============ assessment_events ============
CREATE TABLE public.assessment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  type text NOT NULL,
  step_index int,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.assessment_events TO anon, authenticated;
GRANT SELECT, DELETE ON public.assessment_events TO authenticated;
GRANT ALL ON public.assessment_events TO service_role;

ALTER TABLE public.assessment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can view events" ON public.assessment_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anyone can insert events" ON public.assessment_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "admins can delete events" ON public.assessment_events
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX assessment_events_assessment_idx ON public.assessment_events(assessment_id, created_at DESC);

-- ============ seed templates ============
INSERT INTO public.assessment_templates (name, industry, description, questions, formulas, result_config, ai_recommendations) VALUES
('ROI Calculator', 'General', 'Estimate the return on investment from a change or investment.',
  '[
    {"id":"q1","type":"currency","title":"Current annual revenue","required":true},
    {"id":"q2","type":"percentage","title":"Expected uplift (%)","required":true,"default":10},
    {"id":"q3","type":"currency","title":"Investment amount","required":true}
  ]'::jsonb,
  '[
    {"id":"uplift","label":"Projected uplift","format":"currency","steps":[{"op":"mul","args":[{"kind":"var","ref":"q1"},{"kind":"const","value":0.01}]},{"op":"mul","args":[{"kind":"prev"},{"kind":"var","ref":"q2"}]}]},
    {"id":"roi","label":"ROI","format":"percent","steps":[{"op":"div","args":[{"kind":"var","ref":"uplift"},{"kind":"var","ref":"q3"}]},{"op":"mul","args":[{"kind":"prev"},{"kind":"const","value":100}]}]}
  ]'::jsonb,
  '{"headline":"Your projected ROI","valueVar":"roi","summary":"Based on your answers, here is the estimated return.","primary_cta_label":"Book a strategy call","primary_cta_url":""}'::jsonb,
  '[]'::jsonb
),
('Revenue Leakage Calculator', 'Dental', 'Identify missed revenue from unbooked calls and no-shows.',
  '[
    {"id":"calls","type":"number","title":"Missed calls per week","required":true},
    {"id":"conv","type":"percentage","title":"Typical booking rate (%)","required":true,"default":40},
    {"id":"value","type":"currency","title":"Average patient value","required":true,"default":500}
  ]'::jsonb,
  '[
    {"id":"lostPatients","label":"Lost patients / month","format":"number","steps":[{"op":"mul","args":[{"kind":"var","ref":"calls"},{"kind":"const","value":4.33}]},{"op":"mul","args":[{"kind":"prev"},{"kind":"var","ref":"conv"}]},{"op":"div","args":[{"kind":"prev"},{"kind":"const","value":100}]}]},
    {"id":"monthlyLoss","label":"Monthly revenue loss","format":"currency","steps":[{"op":"mul","args":[{"kind":"var","ref":"lostPatients"},{"kind":"var","ref":"value"}]}]},
    {"id":"annualLoss","label":"Annual revenue loss","format":"currency","steps":[{"op":"mul","args":[{"kind":"var","ref":"monthlyLoss"},{"kind":"const","value":12}]}]}
  ]'::jsonb,
  '{"headline":"Estimated annual revenue loss","valueVar":"annualLoss","summary":"This is the estimated revenue you leave on the table each year.","primary_cta_label":"Book a free practice review","primary_cta_url":""}'::jsonb,
  '[{"id":"r1","when":{"var":"annualLoss","op":">","value":50000},"title":"After-hours call handling","body":"Your biggest revenue leak looks like missed calls. Addressing this first is likely to have the greatest impact.","priority":"high"}]'::jsonb
),
('Savings Calculator', 'General', 'Show cost savings from adopting a new process or tool.', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb),
('Readiness Assessment', 'General', 'Score readiness across a set of yes/no or rating questions.', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb),
('AI Readiness', 'AI', 'Evaluate how prepared an organisation is to adopt AI.', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb),
('Marketing Audit', 'Marketing', 'Audit key marketing channels and produce an action list.', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb),
('Lead Qualification Quiz', 'Sales', 'Qualify inbound leads with a short, weighted quiz.', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb),
('Business Scorecard', 'General', 'Rate a business across pillars and produce a scorecard.', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb);

-- Revoke EXECUTE on trigger fn from anon/authenticated (security memory rule)
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
