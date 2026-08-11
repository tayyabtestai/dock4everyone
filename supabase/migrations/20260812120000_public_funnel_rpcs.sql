-- =====================================================================
-- Public funnel submit + report-read RPCs.
--
-- These let the ANONYMOUS customer flow run with only the publishable/anon
-- key — NO service-role key required. Both are SECURITY DEFINER (they run as
-- the function owner and bypass RLS safely) and granted to `anon`, exactly like
-- the existing `rr_get_published_by_slug`. This removes the
-- "Missing SUPABASE_SERVICE_ROLE_KEY" error from the customer-facing path.
-- =====================================================================

-- Submit a completed assessment: dedupe/create the lead, store the submission,
-- log activity + events. Returns the submission id (the caller supplies it so it
-- knows the id without a read-back). Only fires for PUBLISHED funnels.
CREATE OR REPLACE FUNCTION public.rr_submit_public(
  p_id uuid,
  p_slug text,
  p_industry text,
  p_answers jsonb,
  p_score numeric,
  p_score_breakdown jsonb,
  p_financial jsonb,
  p_recommendations jsonb,
  p_contact jsonb,
  p_session text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calc   public.rr_calculators;
  v_ver_id uuid;
  v_email  text := lower(trim(coalesce(p_contact->>'email', '')));
  v_name   text := trim(coalesce(p_contact->>'first_name', '') || ' ' || coalesce(p_contact->>'last_name', ''));
  v_lead_id uuid;
BEGIN
  SELECT * INTO v_calc
  FROM public.rr_calculators
  WHERE slug = p_slug AND status = 'published'
  LIMIT 1;

  IF v_calc.id IS NULL THEN
    RAISE EXCEPTION 'funnel_not_published';
  END IF;

  SELECT id INTO v_ver_id
  FROM public.rr_calculator_versions
  WHERE calculator_id = v_calc.id AND version = v_calc.published_version
  LIMIT 1;

  -- Lead: one row per email (dedupe), tagged Source = Funnel.
  IF v_email <> '' THEN
    SELECT id INTO v_lead_id FROM public.leads WHERE lower(email) = v_email LIMIT 1;
    IF v_lead_id IS NULL THEN
      INSERT INTO public.leads (
        full_name, first_name, last_name, email, phone, business_name, website, job_title,
        platform, source, funnel_id, funnel_name, funnel_score, funnel_response_data,
        funnel_result, industry
      ) VALUES (
        nullif(v_name, ''), nullif(p_contact->>'first_name', ''), nullif(p_contact->>'last_name', ''),
        v_email, nullif(p_contact->>'phone', ''), nullif(p_contact->>'company', ''),
        nullif(p_contact->>'website', ''), nullif(p_contact->>'job_title', ''),
        'Website', 'Funnel', v_calc.id, v_calc.name, p_score, p_answers, p_financial,
        nullif(p_industry, '')
      ) RETURNING id INTO v_lead_id;
    ELSE
      UPDATE public.leads SET
        source = 'Funnel', funnel_id = v_calc.id, funnel_name = v_calc.name, funnel_score = p_score,
        funnel_response_data = p_answers, funnel_result = p_financial,
        industry = coalesce(nullif(p_industry, ''), industry),
        full_name = coalesce(full_name, nullif(v_name, '')),
        phone = coalesce(phone, nullif(p_contact->>'phone', '')),
        business_name = coalesce(business_name, nullif(p_contact->>'company', '')),
        website = coalesce(website, nullif(p_contact->>'website', '')),
        job_title = coalesce(job_title, nullif(p_contact->>'job_title', ''))
      WHERE id = v_lead_id;
    END IF;
  END IF;

  INSERT INTO public.rr_submissions (
    id, calculator_id, version_id, slug, industry, answers, score, score_breakdown,
    financial_impact, recommendations, lead_id, contact, session_id
  ) VALUES (
    p_id, v_calc.id, v_ver_id, p_slug, nullif(p_industry, ''), p_answers, p_score, p_score_breakdown,
    p_financial, p_recommendations, v_lead_id, p_contact, p_session
  );

  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_activity (lead_id, kind, calculator_slug, submission_id, full_name, email, platform, metadata)
    VALUES (v_lead_id, 'calculator', p_slug, p_id, nullif(v_name, ''), v_email, 'Website',
            jsonb_build_object('funnel', v_calc.name, 'score', p_score));
  END IF;

  INSERT INTO public.rr_events (calculator_id, slug, session_id, event, industry, payload)
  VALUES (v_calc.id, p_slug, p_session, 'contact_submitted', nullif(p_industry, ''), '{}'::jsonb),
         (v_calc.id, p_slug, p_session, 'completed', nullif(p_industry, ''), jsonb_build_object('score', p_score));

  RETURN p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rr_submit_public(uuid, text, text, jsonb, numeric, jsonb, jsonb, jsonb, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rr_submit_public(uuid, text, text, jsonb, numeric, jsonb, jsonb, jsonb, jsonb, text) TO anon, authenticated, service_role;

-- Read a submission for report rendering (customer's own report link).
CREATE OR REPLACE FUNCTION public.rr_get_submission_public(p_id uuid)
RETURNS TABLE (
  calculator_id uuid,
  version_id uuid,
  slug text,
  industry text,
  answers jsonb,
  contact jsonb,
  score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT calculator_id, version_id, slug, industry, answers, contact, score
  FROM public.rr_submissions
  WHERE id = p_id
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.rr_get_submission_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rr_get_submission_public(uuid) TO anon, authenticated, service_role;
