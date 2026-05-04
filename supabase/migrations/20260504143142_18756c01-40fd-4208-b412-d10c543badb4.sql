ALTER TABLE public.invoices
  ADD COLUMN is_rectificative boolean NOT NULL DEFAULT false,
  ADD COLUMN rectified_invoice_number text;