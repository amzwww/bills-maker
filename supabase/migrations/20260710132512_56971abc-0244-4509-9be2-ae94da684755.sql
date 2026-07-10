
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS university_accounting_office_code text,
  ADD COLUMN IF NOT EXISTS university_managing_body_code text,
  ADD COLUMN IF NOT EXISTS university_processing_unit_code text,
  ADD COLUMN IF NOT EXISTS university_proposing_body text;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS university_accounting_office_code text,
  ADD COLUMN IF NOT EXISTS university_managing_body_code text,
  ADD COLUMN IF NOT EXISTS university_processing_unit_code text,
  ADD COLUMN IF NOT EXISTS university_proposing_body text;
