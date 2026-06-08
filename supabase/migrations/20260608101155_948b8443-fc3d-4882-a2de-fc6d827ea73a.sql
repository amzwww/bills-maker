
-- 1) invoice_import_log: SELECT solo admin
DROP POLICY IF EXISTS "Authenticated read import log" ON public.invoice_import_log;
CREATE POLICY "Admins read import log"
  ON public.invoice_import_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) payment-proofs storage: quitar políticas públicas y aplicar admin-only para escritura, authenticated para lectura
DROP POLICY IF EXISTS "Public read payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public update payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public delete payment proofs" ON storage.objects;

CREATE POLICY "Authenticated read payment proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "Admins upload payment proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update payment proofs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete payment proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));
