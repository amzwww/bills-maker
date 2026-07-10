-- Temporarily remove the identity lock so historical rectificative numbering can be normalized safely.
DROP TRIGGER IF EXISTS prevent_invoice_identity_changes_on_invoices ON public.invoices;

-- 1) Normalize existing rectificative invoices before locking identity fields again.
WITH ranked AS (
  SELECT
    id,
    issuer_id,
    year,
    row_number() OVER (
      PARTITION BY issuer_id, year
      ORDER BY invoice_date, created_at, id
    )::int AS rec_seq
  FROM public.invoices
  WHERE is_rectificative = true
)
UPDATE public.invoices i
SET
  seq = ranked.rec_seq,
  invoice_number = ranked.issuer_id || '-REC-' || ranked.year || '-' || lpad(ranked.rec_seq::text, 3, '0')
FROM ranked
WHERE i.id = ranked.id
  AND (
    i.seq IS DISTINCT FROM ranked.rec_seq
    OR i.invoice_number IS DISTINCT FROM ranked.issuer_id || '-REC-' || ranked.year || '-' || lpad(ranked.rec_seq::text, 3, '0')
  );

-- 2) Normal invoices must ignore rectificatives when calculating the next regular number.
CREATE OR REPLACE FUNCTION public.next_invoice_seq(_issuer_id text, _year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(seq), 0) + 1 INTO next_seq
  FROM public.invoices
  WHERE issuer_id = _issuer_id
    AND year = _year
    AND COALESCE(is_rectificative, false) = false;
  RETURN next_seq;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_invoice_gaps(_issuer_id text, _year integer)
RETURNS TABLE(missing_seq integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_seq INT;
BEGIN
  SELECT COALESCE(MAX(seq), 0) INTO max_seq
  FROM public.invoices
  WHERE issuer_id = _issuer_id
    AND year = _year
    AND COALESCE(is_rectificative, false) = false;

  IF max_seq = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s::int AS missing_seq
  FROM generate_series(1, max_seq) s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.issuer_id = _issuer_id
      AND i.year = _year
      AND i.seq = s
      AND COALESCE(i.is_rectificative, false) = false
  )
  ORDER BY s;
END;
$$;

-- 3) Rectificatives have their own independent sequence.
CREATE OR REPLACE FUNCTION public.next_rectificative_invoice_seq(_issuer_id text, _year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(seq), 0) + 1 INTO next_seq
  FROM public.invoices
  WHERE issuer_id = _issuer_id
    AND year = _year
    AND is_rectificative = true;
  RETURN next_seq;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_rectificative_invoice_gaps(_issuer_id text, _year integer)
RETURNS TABLE(missing_seq integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_seq INT;
BEGIN
  SELECT COALESCE(MAX(seq), 0) INTO max_seq
  FROM public.invoices
  WHERE issuer_id = _issuer_id
    AND year = _year
    AND is_rectificative = true;

  IF max_seq = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s::int AS missing_seq
  FROM generate_series(1, max_seq) s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.issuer_id = _issuer_id
      AND i.year = _year
      AND i.seq = s
      AND i.is_rectificative = true
  )
  ORDER BY s;
END;
$$;

-- 4) Lock invoice identity fields after creation.
CREATE OR REPLACE FUNCTION public.prevent_invoice_identity_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.invoice_number IS DISTINCT FROM OLD.invoice_number THEN
    RAISE EXCEPTION 'No se puede cambiar el número original de una factura existente';
  END IF;

  IF NEW.invoice_date IS DISTINCT FROM OLD.invoice_date THEN
    RAISE EXCEPTION 'No se puede cambiar la fecha original de una factura existente';
  END IF;

  IF NEW.year IS DISTINCT FROM OLD.year THEN
    RAISE EXCEPTION 'No se puede cambiar el año original de una factura existente';
  END IF;

  IF NEW.seq IS DISTINCT FROM OLD.seq THEN
    RAISE EXCEPTION 'No se puede cambiar la secuencia original de una factura existente';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_invoice_identity_changes_on_invoices
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.prevent_invoice_identity_changes();

-- 5) Enforce sequence uniqueness inside each numbering family.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_regular_issuer_year_seq_key
ON public.invoices (issuer_id, year, seq)
WHERE COALESCE(is_rectificative, false) = false;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_rectificative_issuer_year_seq_key
ON public.invoices (issuer_id, year, seq)
WHERE is_rectificative = true;