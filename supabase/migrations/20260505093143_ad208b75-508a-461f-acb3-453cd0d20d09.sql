ALTER TABLE public.invoices
  ADD COLUMN is_university boolean NOT NULL DEFAULT false,
  ADD COLUMN university_accounting_office text,
  ADD COLUMN university_managing_body text,
  ADD COLUMN university_processing_unit text;