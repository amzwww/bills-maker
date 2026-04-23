import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown } from "lucide-react";
import { eur } from "@/lib/invoiceCalc";
import { generateInvoicePdf, type Issuer } from "@/lib/pdf";
import { toast } from "sonner";

const InvoicesList = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [issuers, setIssuers] = useState<Record<string, Issuer>>({});

  useEffect(() => {
    (async () => {
      const [{ data: invs }, { data: iss }] = await Promise.all([
        supabase.from("invoices").select("*").order("created_at", { ascending: false }),
        supabase.from("issuers").select("*"),
      ]);
      setRows(invs || []);
      const map: Record<string, Issuer> = {};
      (iss || []).forEach((i: any) => (map[i.id] = i));
      setIssuers(map);
    })();
  }, []);

  const downloadPdf = (inv: any) => {
    const issuer = issuers[inv.issuer_id];
    if (!issuer) {
      toast.error("Emisor no encontrado");
      return;
    }
    generateInvoicePdf({
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
      line_items: inv.line_items || [],
      subtotal: parseFloat(inv.subtotal),
      vat_rate: parseFloat(inv.vat_rate),
      vat_label: inv.vat_label,
      vat_amount: parseFloat(inv.vat_amount),
      irpf_rate: parseFloat(inv.irpf_rate),
      irpf_amount: parseFloat(inv.irpf_amount),
      total: parseFloat(inv.total),
      pre_payment_note: inv.pre_payment_note,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon"><Link to="/"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-xl font-bold">Facturas emitidas</h1>
        </div>
      </header>
      <main className="container py-6">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="p-3">Número</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Tipo</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aún no hay facturas</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono">{r.invoice_number}</td>
                  <td className="p-3">{r.invoice_date}</td>
                  <td className="p-3">{r.client_name}</td>
                  <td className="p-3 capitalize">{r.invoice_type}</td>
                  <td className="p-3 text-right font-semibold">{eur(parseFloat(r.total))}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(r)}>
                      <FileDown className="h-4 w-4 mr-1" />PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </div>
  );
};

export default InvoicesList;
