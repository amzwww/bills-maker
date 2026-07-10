import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, FileDown, Eye, Pencil, Trash2, FileText, ArrowRightCircle, Plus } from "lucide-react";
import { eur } from "@/lib/invoiceCalc";
import { generateInvoicePdf, type Issuer } from "@/lib/pdf";
import { quotePdfData } from "@/lib/invoicePdfData";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const QuotesList = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [issuers, setIssuers] = useState<Record<string, Issuer>>({});
  const [deleteOpen, setDeleteOpen] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [numberFilter, setNumberFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "converted">("all");

  const reload = async () => {
    const { data } = await supabase.from("quotes" as any).select("*").order("quote_date", { ascending: false });
    setRows((data as any[]) || []);
  };

  useEffect(() => {
    (async () => {
      const [{ data: qs }, { data: iss }] = await Promise.all([
        supabase.from("quotes" as any).select("*").order("quote_date", { ascending: false }),
        supabase.from("issuers").select("*"),
      ]);
      setRows((qs as any[]) || []);
      const map: Record<string, Issuer> = {};
      (iss || []).forEach((i: any) => (map[i.id] = i));
      setIssuers(map);
    })();
  }, []);

  const renderPdf = (q: any, mode: "save" | "open") => {
    const issuer = issuers[q.issuer_id];
    if (!issuer) return toast.error("Emisor no encontrado");
    generateInvoicePdf(quotePdfData(q, issuer), mode);
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (numberFilter && !r.quote_number.toLowerCase().includes(numberFilter.toLowerCase())) return false;
      if (clientFilter && !r.client_name.toLowerCase().includes(clientFilter.toLowerCase())) return false;
      if (statusFilter === "converted" && !r.converted_invoice_number) return false;
      if (statusFilter === "pending" && r.converted_invoice_number) return false;
      return true;
    });
  }, [rows, numberFilter, clientFilter, statusFilter]);

  const handleConvert = async (q: any) => {
    // Navega a NewInvoice con prefill desde el quote
    navigate(`/nueva?issuer=JHE&type=${q.invoice_type}&fromQuote=${q.id}`);
  };

  const handleDelete = async () => {
    if (!deleteOpen) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("quotes" as any).delete().eq("id", deleteOpen.id);
      if (error) throw error;
      toast.success(`Presupuesto ${deleteOpen.quote_number} eliminado`);
      setDeleteOpen(null);
      setDeleteConfirmText("");
      reload();
    } catch (e: any) {
      toast.error(e.message || "Error eliminando");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Presupuestos</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} de {rows.length}</p>
          </div>
          {isAdmin && (
            <Button asChild>
              <Link to="/presupuestos/nuevo?type=ponencia"><Plus className="h-4 w-4 mr-2" />Nuevo presupuesto</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="container py-6 space-y-4">
        <Card className="p-3 flex flex-wrap items-center gap-2">
          <Input placeholder="Nº" value={numberFilter} onChange={(e) => setNumberFilter(e.target.value)} className="h-8 w-28" />
          <Input placeholder="Cliente" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="h-8 w-48" />
          <div className="flex gap-1">
            <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>Todos</Button>
            <Button size="sm" variant={statusFilter === "pending" ? "default" : "outline"} onClick={() => setStatusFilter("pending")}>Pendientes</Button>
            <Button size="sm" variant={statusFilter === "converted" ? "default" : "outline"} onClick={() => setStatusFilter("converted")}>Convertidos</Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2">Nº</th>
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Cliente</th>
                <th className="text-right p-2">Total</th>
                <th className="text-center p-2">Estado</th>
                <th className="text-right p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 font-mono">{q.quote_number}</td>
                  <td className="p-2">{q.quote_date}</td>
                  <td className="p-2">{q.client_name}</td>
                  <td className="p-2 text-right font-semibold">{eur(parseFloat(q.total))}</td>
                  <td className="p-2 text-center">
                    {q.converted_invoice_number ? (
                      <Badge variant="secondary" className="font-mono">→ {q.converted_invoice_number}</Badge>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" title="Ver PDF" onClick={() => renderPdf(q, "open")}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Descargar PDF" onClick={() => renderPdf(q, "save")}><FileDown className="h-4 w-4" /></Button>
                      {isAdmin && !q.converted_invoice_number && (
                        <Button size="icon" variant="ghost" title="Convertir a factura" onClick={() => handleConvert(q)}>
                          <ArrowRightCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button size="icon" variant="ghost" title="Editar" asChild>
                          <Link to={`/presupuestos/nuevo?edit=${q.id}`}><Pencil className="h-4 w-4" /></Link>
                        </Button>
                      )}
                      {isAdmin && (
                        <Button size="icon" variant="ghost" title="Eliminar" onClick={() => setDeleteOpen(q)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sin presupuestos</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </main>

      <Dialog open={!!deleteOpen} onOpenChange={(o) => { if (!o) { setDeleteOpen(null); setDeleteConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar presupuesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Vas a eliminar <strong className="font-mono">{deleteOpen?.quote_number}</strong>. Escribe el número para confirmar:</p>
            <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder={deleteOpen?.quote_number} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleting || deleteConfirmText !== deleteOpen?.quote_number} onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotesList;
