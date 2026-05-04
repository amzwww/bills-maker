export const PRE_PAYMENT_NOTES = {
  none: { label: "Ninguno", text: "" },
  opt1: {
    label: "1 - 50% por adelantado",
    text:
      "Por autorización expresa, se factura el 50% de importe de la ponencia.\n\nQueda pendiente de facturar el 50% restante y los gastos de desplazamiento y logística de Jon para asistir al evento.",
  },
  opt2: {
    label: "2 - Pendientes logística (y alojamiento)",
    text:
      "Quedan pendientes de facturar los costes de la logística de Jon para acudir al evento y, si fuera preciso, alojamiento",
  },
  opt3: {
    label: "3 - Restante 50% + logística",
    text:
      "Se factura el restante 50% más los gastos de desplazamiento y logística de Jon para acudir al evento.",
  },
  other: { label: "Otros (texto libre)", text: "" },
} as const;

export type PrePaymentKey = keyof typeof PRE_PAYMENT_NOTES;

export const POST_PAYMENT_NOTE =
  "Dado que la agenda de Jon se organiza con mucha antelación nos es preciso que la factura esté debidamente gestionada y cerrada con al menos un mes de antelación sobre la fecha de la ponencia\n\nAs Jon's agenda is planned well in advance, it is necessary for the invoice to be properly processed and finalized at least one month before the date of the keynote.";

export const COMPLEMENT_INDENTED_LINE =
  "Gastos de desplazamiento y logística para la asistencia de Jon al evento";

export function ponenciaDescription(dateISO: string): string {
  // dateISO yyyy-mm-dd
  const [y, m, d] = dateISO.split("-");
  return `Ponencia ${d}/${m}/${y}; La IA, ola o tsunami?`;
}
