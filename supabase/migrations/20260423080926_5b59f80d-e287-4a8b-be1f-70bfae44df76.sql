
-- Tabla de emisores (Jon, BrightNexus)
CREATE TABLE public.issuers (
  id TEXT PRIMARY KEY, -- 'JHE' o 'BN'
  name TEXT NOT NULL,
  tax_id TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city_zip TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  ccc TEXT,
  iban TEXT,
  swift TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.issuers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read issuers" ON public.issuers FOR SELECT USING (true);
CREATE POLICY "Public insert issuers" ON public.issuers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update issuers" ON public.issuers FOR UPDATE USING (true);

-- Tabla de facturas
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id TEXT NOT NULL REFERENCES public.issuers(id),
  invoice_number TEXT NOT NULL UNIQUE, -- p.ej. JHE-2026-008
  year INT NOT NULL,
  seq INT NOT NULL,
  invoice_type TEXT NOT NULL, -- 'ponencia' | 'complemento' | 'sponsor'
  invoice_date DATE NOT NULL,
  parent_invoice_number TEXT, -- para complementos
  our_reference TEXT,
  their_order TEXT,

  -- Cliente
  client_name TEXT NOT NULL,
  client_tax_id TEXT,
  client_address_line1 TEXT,
  client_address_line2 TEXT,
  client_city_zip TEXT,
  client_country TEXT,
  client_is_foreign BOOLEAN NOT NULL DEFAULT false,
  client_is_canary BOOLEAN NOT NULL DEFAULT false,

  -- Líneas (JSON: [{description, unit_price, quantity, total, indented?}])
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Importes
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0, -- 21, 7 (IGIC) o 0
  vat_label TEXT NOT NULL DEFAULT 'IVA', -- 'IVA' o 'IGIC'
  vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  irpf_rate NUMERIC(5,2) NOT NULL DEFAULT 0, -- 15 o 0
  irpf_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Textos opcionales
  pre_payment_note TEXT,   -- texto opcional antes de forma de pago (1, 2 o 3)
  post_payment_note TEXT,  -- texto fijo bajo forma de pago

  notes TEXT,
  status TEXT NOT NULL DEFAULT 'issued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Public insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update invoices" ON public.invoices FOR UPDATE USING (true);
CREATE POLICY "Public delete invoices" ON public.invoices FOR DELETE USING (true);

CREATE INDEX idx_invoices_issuer_year ON public.invoices(issuer_id, year);
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);

-- Función: siguiente número correlativo por emisor y año
CREATE OR REPLACE FUNCTION public.next_invoice_seq(_issuer_id TEXT, _year INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(seq), 0) + 1 INTO next_seq
  FROM public.invoices
  WHERE issuer_id = _issuer_id AND year = _year;
  RETURN next_seq;
END;
$$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_issuers_updated BEFORE UPDATE ON public.issuers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Datos del emisor Jon (extraídos de los PDFs adjuntos)
INSERT INTO public.issuers (id, name, tax_id, address_line1, city_zip, phone, ccc, iban, swift) VALUES
('JHE', 'Jonatan Hernández Vallvé', '46817238W', 'C/ Joan D''Àustria 126, 3º 3ª', '08018 Barcelona', '0034 613 35 95 91',
 '2100 0859 2702 0104 4124', 'ES63 2100 0859 2702 0104 4124', 'CAIXESBBXXX');

-- Placeholder para BrightNexus (editable desde la app cuando me pases los datos)
INSERT INTO public.issuers (id, name, tax_id, address_line1, city_zip, phone, ccc, iban, swift) VALUES
('BN', 'BrightNexus', 'B-PENDIENTE', 'Dirección pendiente', 'CP Ciudad pendiente', '',
 '', '', '');
