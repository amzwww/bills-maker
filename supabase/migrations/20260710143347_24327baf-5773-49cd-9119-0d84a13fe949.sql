CREATE OR REPLACE FUNCTION public.next_invoice_seq(_issuer_id text, _year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_seq INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

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
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

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

CREATE OR REPLACE FUNCTION public.next_rectificative_invoice_seq(_issuer_id text, _year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_seq INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

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
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

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

CREATE OR REPLACE FUNCTION public.next_quote_seq(_issuer_id text, _year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_seq INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT COALESCE(MAX(seq), 0) + 1 INTO next_seq
  FROM public.quotes
  WHERE issuer_id = _issuer_id AND year = _year;
  RETURN next_seq;
END;
$$;

REVOKE ALL ON FUNCTION public.next_invoice_seq(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_invoice_gaps(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_rectificative_invoice_seq(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_rectificative_invoice_gaps(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_quote_seq(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prevent_invoice_identity_changes() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.next_invoice_seq(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_invoice_gaps(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_rectificative_invoice_seq(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_rectificative_invoice_gaps(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_quote_seq(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;