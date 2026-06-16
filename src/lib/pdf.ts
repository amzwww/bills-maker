import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { eur, type LineItem } from "./invoiceCalc";
import { POST_PAYMENT_NOTE } from "./invoiceTexts";

export type Issuer = {
  id: string;
  name: string;
  tax_id: string;
  address_line1: string;
  address_line2?: string | null;
  city_zip: string;
  phone?: string | null;
  ccc?: string | null;
  iban?: string | null;
  swift?: string | null;
};

export type InvoicePdfData = {
  issuer: Issuer;
  invoice_number: string;
  invoice_date: string; // ISO yyyy-mm-dd
  our_reference?: string | null;
  their_order?: string | null;
  client_name: string;
  client_tax_id?: string | null;
  client_address_line1?: string | null;
  client_address_line2?: string | null;
  client_city_zip?: string | null;
  client_country?: string | null;
  line_items: LineItem[];
  subtotal: number;
  vat_rate: number;
  vat_label: string;
  vat_amount: number;
  irpf_rate: number;
  irpf_amount: number;
  total: number;
  pre_payment_note?: string | null;
  invoice_type?: string;
  is_rectificative?: boolean;
  rectified_invoice_number?: string | null;
  is_university?: boolean;
  university_accounting_office?: string | null;
  university_managing_body?: string | null;
  university_processing_unit?: string | null;
  is_quote?: boolean;
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function generateInvoicePdf(data: InvoicePdfData, mode: "save" | "open" = "save") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = margin;

  // Cabecera emisor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.issuer.name, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.issuer.tax_id, margin, y);
  y += 4;
  doc.text(data.issuer.address_line1, margin, y);
  y += 4;
  if (data.issuer.address_line2) {
    doc.text(data.issuer.address_line2, margin, y);
    y += 4;
  }
  doc.text(data.issuer.city_zip, margin, y);
  y += 4;
  if (data.issuer.phone) {
    doc.text(`Teléfono ${data.issuer.phone}`, margin, y);
    y += 4;
  }

  // Título FACTURA / FACTURA RECTIFICATIVA / PRESUPUESTO
  doc.setFont("helvetica", "bold");
  if (data.is_quote) {
    doc.setFontSize(28);
    doc.setTextColor(30, 64, 175);
    doc.text("PRESUPUESTO", pageW - margin, margin + 6, { align: "right" });
  } else if (data.is_rectificative) {
    doc.setFontSize(20);
    doc.setTextColor(180, 30, 30);
    doc.text("FACTURA", pageW - margin, margin + 2, { align: "right" });
    doc.text("RECTIFICATIVA", pageW - margin, margin + 9, { align: "right" });
  } else {
    doc.setFontSize(28);
    doc.setTextColor(30, 64, 175);
    doc.text("FACTURA", pageW - margin, margin + 6, { align: "right" });
  }
  doc.setTextColor(0, 0, 0);

  // Fecha y número
  y = margin + 18;
  doc.setFontSize(10);
  const labelOffset = data.is_quote ? 65 : 50;
  doc.setFont("helvetica", "bold");
  doc.text("FECHA:", pageW - margin - labelOffset, y);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(data.invoice_date), pageW - margin, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(data.is_quote ? "PRESUPUESTO Nº:" : "FACTURA Nº:", pageW - margin - labelOffset, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.invoice_number, pageW - margin, y, { align: "right" });
  y += 5;
  if (data.is_rectificative && data.rectified_invoice_number) {
    doc.setFont("helvetica", "bold");
    doc.text("RECTIFICA A:", pageW - margin - labelOffset, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.rectified_invoice_number, pageW - margin, y, { align: "right" });
    y += 5;
  }

  // Facturar a (bloque vertical limpio, sin solapes ni duplicados)
  y = Math.max(y, margin + 40) + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("FACTURAR A:", margin, y);
  y += 5;
  // Handle long client names — wrap to multiple lines
  const maxClientW = pageW - margin * 2;
  const nameLines = doc.splitTextToSize(data.client_name, maxClientW) as string[];
  for (const nl of nameLines) {
    doc.text(nl, margin, y);
    y += 5;
  }
  doc.setFont("helvetica", "normal");
  const clientLines = [
    data.client_tax_id,
    data.client_address_line1,
    data.client_address_line2,
    data.client_city_zip,
    data.client_country,
  ].filter((v): v is string => !!v && v.trim().length > 0);
  const dedup: string[] = [];
  for (const l of clientLines) {
    const norm = l.trim().toLowerCase();
    if (!dedup.some((d) => d.trim().toLowerCase() === norm)) dedup.push(l);
  }
  for (const l of dedup) {
    doc.text(l, margin, y);
    y += 5;
  }

  // University fields
  if (data.is_university) {
    y += 2;
    const uniFields = [
      { label: "Oficina contable:", value: data.university_accounting_office },
      { label: "Órgano Gestor:", value: data.university_managing_body },
      { label: "Unidad Tramitadora:", value: data.university_processing_unit },
    ];
    for (const uf of uniFields) {
      if (uf.value && uf.value.trim()) {
        doc.setFont("helvetica", "bold");
        doc.text(uf.label, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(uf.value, margin + doc.getTextWidth(uf.label) + 2, y);
        y += 5;
      }
    }
  }

  // Referencia del cliente (SEGÚN SU PEDIDO) - debajo de la dirección
  if (data.their_order) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const label = "SEGÚN SU Nº DE PEDIDO:";
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    const labelW = doc.getTextWidth(label);
    const valueX = margin + labelW + 3;
    const maxValueW = pageW - margin - valueX;
    const orderLines = doc.splitTextToSize(data.their_order, maxValueW) as string[];
    doc.text(orderLines[0], valueX, y);
    y += 5;
    for (let i = 1; i < orderLines.length; i++) {
      doc.text(orderLines[i], valueX, y);
      y += 5;
    }
  }

  y += 4;

  // Tabla líneas
  const body = data.line_items.map((it) => [
    (it.indented ? "    " : "") + it.description,
    it.parent_header ? "" : eur(it.unit_price),
    it.parent_header ? "" : String(it.quantity),
    it.parent_header ? "" : eur(it.total),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["DESCRIPCIÓN", "PRECIO UNIDAD", "CANTIDAD", "TOTAL"]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      halign: "center",
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, valign: "top" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 28 },
      2: { halign: "right", cellWidth: 22 },
      3: { halign: "right", cellWidth: 28 },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore
  let endY = (doc as any).lastAutoTable.finalY + 4;

  // Totales
  const totalsX = pageW - margin - 56;
  const totalsValX = pageW - margin;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("SUBTOTAL", totalsX, endY + 4);
  doc.text(eur(data.subtotal), totalsValX, endY + 4, { align: "right" });

  let line = endY + 9;
  if (data.vat_amount > 0 || data.vat_rate > 0) {
    doc.text(`${data.vat_label} ${data.vat_rate.toFixed(2)}%`, totalsX, line);
    doc.text(eur(data.vat_amount), totalsValX, line, { align: "right" });
    line += 5;
  }
  if (data.irpf_amount > 0 || data.irpf_rate > 0) {
    doc.text(`IRPF ${data.irpf_rate.toFixed(2)}%`, totalsX, line);
    doc.text("-" + eur(data.irpf_amount), totalsValX, line, { align: "right" });
    line += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.setFillColor(230, 235, 245);
  doc.rect(totalsX - 4, line - 4, pageW - margin - totalsX + 4, 7, "F");
  doc.text(data.is_quote ? "TOTAL PRESUPUESTO" : "TOTAL FACTURA", totalsX, line + 1);
  doc.text(eur(data.total), totalsValX, line + 1, { align: "right" });

  let cursor = line + 14;

  // Pre-payment note (si existe)
  if (data.pre_payment_note && data.pre_payment_note.trim()) {
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(data.pre_payment_note, pageW - margin * 2);
    doc.text(lines, margin, cursor);
    cursor += lines.length * 4 + 4;
  }

  // Forma de pago (etiquetas alineadas en columna)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Forma de pago:", margin, cursor);
  cursor += 5;
  doc.setFontSize(9);
  const labelX = margin;
  const valueX = margin + 38; // columna fija de valores
  const payRows: { label: string; value: string }[] = [];
  if (data.issuer.ccc) payRows.push({ label: "CCC:", value: data.issuer.ccc });
  if (data.issuer.iban) payRows.push({ label: "IBAN:", value: data.issuer.iban });
  if (data.issuer.swift) payRows.push({ label: "SWIFT:", value: data.issuer.swift });
  for (const row of payRows) {
    doc.setFont("helvetica", "bold");
    doc.text(row.label, labelX, cursor);
    doc.setFont("helvetica", "normal");
    doc.text(row.value, valueX, cursor);
    cursor += 5;
  }

  cursor += 4;

  // Post-payment note (excepto en facturas de sponsor)
  if (data.invoice_type !== "sponsor") {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    const postLines = doc.splitTextToSize(POST_PAYMENT_NOTE, pageW - margin * 2);
    doc.text(postLines, margin, cursor);
  }

  if (mode === "open") {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    doc.save(`${data.invoice_number} - ${data.client_name}.pdf`);
  }
}
