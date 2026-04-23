import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileDown,
  CheckCircle2,
  Upload,
  ExternalLink,
  Undo2,
} from "lucide-react";
import { eur } from "@/lib/invoiceCalc";
import { generateInvoicePdf, type Issuer } from "@/lib/pdf";
import { toast } from "sonner";

const InvoicesList = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [issuers, setIssuers] = useState<Record<string, Issuer>>({});
  const [payOpen, setPayOpen] = useState<any | null>(null);
  const [paidAt, setPaidAt] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = async () => {
    const { data: invs } = await supabase
      .from("invoices")
      .select("*")
      .order("invoice_date", { ascending: false });
    setRows(invs || []);
  };

  useEffect(() => {
    (async () => {
      const [{ data: invs }, { data: iss }] = await Promise.all([
        supabase.from("invoices").select("*").order("invoice_date", { ascending: false }),
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
    if (!issuer) return toast.error("Emisor no encontrado");
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

  const openPaid = (inv: any) => {
    setPayOpen(inv);
    setPaidAt(new Date().toISOString().slice(0, 10));
    setProofFile(null);
  };

  const savePaid = async () => {
    if (!payOpen) return;
    if (!paidAt) return toast.error("Indica la fecha de cobro");
    setSaving(true);
    try {
      let proofUrl: string | null = payOpen.payment_proof_url || null;
      if (proofFile) {
        const ext = proofFile.name.split(".").pop() || "pdf";
        const path = `${payOpen.invoice_number}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, proofFile, { upsert: true });
        if (upErr) throw upErr;
        proofUrl = path;
      }
      const { error } = await supabase
        .from("invoices")
        .update({ paid: true, paid_at: paidAt, payment_proof_url: proofUrl })
        .eq("id", payOpen.id);
      if (error) throw error;
      toast.success("Marcada como cobrada");
      setPayOpen(null);
      await reload();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const undoPaid = async (inv: any) => {
    const { error } = await supabase
      .from("invoices")
      .update({ paid: false, paid_at: null, payment_proof_url: null })
      .eq("id", inv.id);
    if (error) return toast.error(error.message);
    if (inv.payment_proof_url) {
      await supabase.storage.from("payment-proofs").remove([inv.payment_proof_url]);
    }
    toast.success("Marcada como pendiente");
    reload();
  };

  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 60 * 5);
    if (error || !data?.signedUrl) return toast.error("No se pudo abrir el justificante");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-xl font-bold">Facturas emitidas</h1>
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link to="/clientes">Ver por clientes</Link>
          </Button>
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
                <th className="p-3 text-center">Cobro</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Aún no hay facturas</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono">{r.invoice_number}</td>
                  <td className="p-3">{r.invoice_date}</td>
                  <td className="p-3">{r.client_name}</td>
                  <td className="p-3 capitalize">{r.invoice_type}</td>
                  <td className="p-3 text-right font-semibold">{eur(parseFloat(r.total))}</td>
                  <td className="p-3 text-center">
                    {r.paid ? (
                      <div className="flex items-center justify-center gap-2">
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {r.paid_at}
                        </Badge>
                        {r.payment_proof_url && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => viewProof(r.payment_proof_url)}
                            title="Ver justificante"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => undoPaid(r)}
                          title="Deshacer cobro"
                        >
                          <Undo2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openPaid(r)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Cobrada
                      </Button>
                    )}
                  </td>
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

      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Marcar como cobrada · {payOpen?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fecha de cobro</Label>
              <Input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div>
              <Label>Justificante (PDF, imagen)</Label>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />Seleccionar archivo
                </Button>
                <span className="text-sm text-muted-foreground truncate">
                  {proofFile ? proofFile.name : "Sin archivo (opcional)"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>
              Cancelar
            </Button>
            <Button onClick={savePaid} disabled={saving}>
              {saving ? "Guardando…" : "Confirmar cobro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesList;
