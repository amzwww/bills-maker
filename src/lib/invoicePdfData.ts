import type { LineItem } from "./invoiceCalc";
import type { InvoicePdfData, Issuer } from "./pdf";

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  const parsed = parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
};

export function invoicePdfData(inv: any, issuer: Issuer): InvoicePdfData {
  return {
    issuer,
    invoice_number: inv.invoice_number,
    invoice_date: inv.invoice_date,
    our_reference: inv.our_reference,
    their_order: inv.their_order,
    client_name: inv.client_name,
    client_tax_id: inv.client_tax_id,
    client_address_line1: inv.client_address_line1,
    client_address_line2: inv.client_address_line2,
    client_city_zip: inv.client_city_zip,
    client_country: inv.client_country,
    line_items: (inv.line_items || []) as LineItem[],
    subtotal: toNumber(inv.subtotal),
    vat_rate: toNumber(inv.vat_rate),
    vat_label: inv.vat_label,
    vat_amount: toNumber(inv.vat_amount),
    irpf_rate: toNumber(inv.irpf_rate),
    irpf_amount: toNumber(inv.irpf_amount),
    total: toNumber(inv.total),
    pre_payment_note: inv.pre_payment_note,
    invoice_type: inv.invoice_type,
    is_rectificative: !!inv.is_rectificative,
    rectified_invoice_number: inv.rectified_invoice_number,
    is_university: !!inv.is_university,
    university_accounting_office: inv.university_accounting_office,
    university_accounting_office_code: inv.university_accounting_office_code,
    university_managing_body: inv.university_managing_body,
    university_managing_body_code: inv.university_managing_body_code,
    university_processing_unit: inv.university_processing_unit,
    university_processing_unit_code: inv.university_processing_unit_code,
    university_proposing_body: inv.university_proposing_body,
  };
}

export function quotePdfData(quote: any, issuer: Issuer): InvoicePdfData {
  return {
    ...invoicePdfData(
      {
        ...quote,
        invoice_number: quote.quote_number,
        invoice_date: quote.quote_date,
        is_rectificative: false,
        rectified_invoice_number: null,
      },
      issuer,
    ),
    is_quote: true,
  };
}