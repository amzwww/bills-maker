
-- Bucket para los PDFs originales de las facturas importadas
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-sources', 'invoice-sources', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage: solo admins gestionan los PDFs de origen
CREATE POLICY "Admins read invoice sources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'invoice-sources' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload invoice sources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoice-sources' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update invoice sources"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'invoice-sources' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete invoice sources"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'invoice-sources' AND public.has_role(auth.uid(), 'admin'));

-- Asociación factura <-> PDF de origen
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS source_pdf_url text,
  ADD COLUMN IF NOT EXISTS source_pdf_name text;

-- Historial de cargas / importaciones (auditoría)
CREATE TABLE IF NOT EXISTS public.invoice_import_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  source_pdf_name text,
  source_pdf_url text,
  action text NOT NULL DEFAULT 'import', -- import | update | manual
  imported_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_by uuid,
  imported_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read import log"
ON public.invoice_import_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins insert import log"
ON public.invoice_import_log FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete import log"
ON public.invoice_import_log FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_import_log_invoice_number
  ON public.invoice_import_log (invoice_number);
CREATE INDEX IF NOT EXISTS idx_import_log_invoice_id
  ON public.invoice_import_log (invoice_id);
