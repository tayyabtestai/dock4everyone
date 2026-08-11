-- Extend leads with additional address + social columns used by CSV/Excel imports.
-- Non-destructive: only adds columns if they don't already exist.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS company_street_address text,
  ADD COLUMN IF NOT EXISTS company_raw_address text,
  ADD COLUMN IF NOT EXISTS company_postal_code text,
  ADD COLUMN IF NOT EXISTS email_domain_catchall text;
