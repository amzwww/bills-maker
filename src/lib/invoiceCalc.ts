export type LineItem = {
  description: string;
  unit_price: number;
  quantity: number;
  total: number;
  indented?: boolean;
  parent_header?: boolean; // línea que es solo un encabezado (sin importes), p.ej. la "Ponencia DD/MM/AAAA" en complementos
};

export type TaxContext = {
  isForeign: boolean;
  isCanary: boolean;
};

export function computeTaxes(subtotal: number, ctx: TaxContext) {
  if (ctx.isForeign) {
    return { vat_rate: 0, vat_label: "IVA", vat_amount: 0, irpf_rate: 0, irpf_amount: 0 };
  }
  if (ctx.isCanary) {
    const vat_amount = round2(subtotal * 0.07);
    const irpf_amount = round2(subtotal * 0.15);
    return { vat_rate: 7, vat_label: "IGIC", vat_amount, irpf_rate: 15, irpf_amount };
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
