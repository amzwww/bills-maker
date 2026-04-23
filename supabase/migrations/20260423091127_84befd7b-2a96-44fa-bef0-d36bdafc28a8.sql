
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at DATE,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read payment proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "Public upload payment proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Public update payment proofs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "Public delete payment proofs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'payment-proofs');
