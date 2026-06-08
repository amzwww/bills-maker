
-- Tabla de presupuestos
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id TEXT NOT NULL,
  quote_number TEXT NOT NULL UNIQUE,
  year INT NOT NULL,
  seq INT NOT NULL,
  invoice_type TEXT NOT NULL DEFAULT 'ponencia',
  quote_date DATE NOT NULL,
  our_reference TEXT,
  their_order TEXT,
  client_name TEXT NOT NULL,
  client_tax_id TEXT,
  client_address_line1 TEXT,
  client_address_line2 TEXT,
  client_city_zip TEXT,
  client_country TEXT,
  client_is_foreign BOOLEAN NOT NULL DEFAULT false,
  client_is_canary BOOLEAN NOT NULL DEFAULT false,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC NOT NULL DEFAULT 0,
  vat_label TEXT NOT NULL DEFAULT 'IVA',
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  irpf_rate NUMERIC NOT NULL DEFAULT 0,
  irpf_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  pre_payment_note TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  converted_invoice_number TEXT,
  is_university BOOLEAN NOT NULL DEFAULT false,
  university_accounting_office TEXT,
  university_managing_body TEXT,
  university_processing_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quotes"
  ON public.quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert quotes"
  ON public.quotes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update quotes"
  ON public.quotes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete quotes"
  ON public.quotes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Numeración correlativa para presupuestos
CREATE OR REPLACE FUNCTION public.next_quote_seq(_issuer_id text, _year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(seq), 0) + 1 INTO next_seq
  FROM public.quotes
  WHERE issuer_id = _issuer_id AND year = _year;
  RETURN next_seq;
END;
$$;

-- Relación opcional: factura creada desde un presupuesto
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS source_quote_number TEXT;
