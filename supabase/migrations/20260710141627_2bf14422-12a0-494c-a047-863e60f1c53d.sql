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

DROP TRIGGER IF EXISTS prevent_invoice_identity_changes_on_invoices ON public.invoices;

CREATE TRIGGER prevent_invoice_identity_changes_on_invoices
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.prevent_invoice_identity_changes();