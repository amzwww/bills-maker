CREATE OR REPLACE FUNCTION public.find_invoice_gaps(_issuer_id text, _year integer)
RETURNS TABLE(missing_seq integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_seq INT;
BEGIN
  SELECT COALESCE(MAX(seq), 0) INTO max_seq
  FROM public.invoices
  WHERE issuer_id = _issuer_id AND year = _year;

  IF max_seq = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s::int AS missing_seq
  FROM generate_series(1, max_seq) s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.issuer_id = _issuer_id AND i.year = _year AND i.seq = s
  )
  ORDER BY s;
END;
$$;