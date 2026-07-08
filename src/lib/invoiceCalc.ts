export type LineItem = {
  description: string;
  unit_price: number;
  quantity: number;
  total: number;
  indented?: boolean;
  parent_header?: boolean; // línea que es solo un encabezado (sin importes), p.ej. la "Ponencia DD/MM/AAAA" en complementos
};

export type CanaryIgicRate = 0 | 7 | 20;

export type TaxContext = {
  isForeign: boolean;
  isCanary: boolean;
  canaryIgicRate?: CanaryIgicRate;
};

export function computeTaxes(subtotal: number, ctx: TaxContext) {
  if (ctx.isForeign) {
    return { vat_rate: 0, vat_label: "IVA", vat_amount: 0, irpf_rate: 0, irpf_amount: 0 };
  }
  if (ctx.isCanary) {
    const rate = (ctx.canaryIgicRate ?? 0) as CanaryIgicRate;
    const vat_amount = round2(subtotal * (rate / 100));
    const irpf_amount = round2(subtotal * 0.15);
    return { vat_rate: rate, vat_label: "IGIC", vat_amount, irpf_rate: 15, irpf_amount };
  }
  const vat_amount = round2(subtotal * 0.21);
  const irpf_amount = round2(subtotal * 0.15);
  return { vat_rate: 21, vat_label: "IVA", vat_amount, irpf_rate: 15, irpf_amount };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeSubtotal(items: LineItem[]) {
  return round2(items.reduce((s, it) => s + (it.parent_header ? 0 : it.total), 0));
}

export function eur(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);
}

export type InvoiceType = "ponencia" | "gastos" | "mixta" | "sponsor" | "complemento" | "formacion" | "master" | "coworking";

/**
 * Clasifica el tipo de factura por contenido de líneas:
 * - ponencia: línea con "ponencia" e importe > 0 (sin gasto con importe)
 * - gastos: línea que empieza por "gastos"/"costes" con importe (sin ponencia con importe)
 * - mixta: ambas con importe
 * - sponsor: ninguna
 */
export function classifyInvoice(items: LineItem[]): InvoiceType {
  const real = items.filter((it) => !it.parent_header);
  let hasPon = false;
  let hasGas = false;
  for (const it of real) {
    const d = (it.description || "").trim().toLowerCase();
    const price = Number(it.unit_price || 0);
    const isGas =
      d.startsWith("gastos") ||
      d.startsWith("costes") ||
      d.startsWith("coste ") ||
      d.startsWith("desplaza");
    const isPon = d.includes("ponencia") && !isGas;
    if (isPon && price > 0) hasPon = true;
    else if (isGas && price > 0) hasGas = true;
  }
  if (hasPon && hasGas) return "mixta";
  if (hasPon) return "ponencia";
  if (hasGas) return "gastos";
  return "sponsor";
}
