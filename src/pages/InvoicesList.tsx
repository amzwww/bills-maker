import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileDown,
  CheckCircle2,
  Upload,
  ExternalLink,
  Undo2,
  FileSpreadsheet,
  X,
  Trash2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { eur } from "@/lib/invoiceCalc";
import { generateInvoicePdf, type Issuer } from "@/lib/pdf";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type SortKey = "invoice_number" | "invoice_date" | "client_name" | "total";
type SortDir = "asc" | "desc";

const InvoicesList = () => {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [issuers, setIssuers] = useState<Record<string, Issuer>>({});
  const [payOpen, setPayOpen] = useState<any | null>(null);
  const [paidAt, setPaidAt] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // filtros y orden
  const [clientFilter, setClientFilter] = useState("");
  const [conceptFilter, setConceptFilter] = useState("");
  const [issuerFilter, setIssuerFilter] = useState<"all" | "JHE" | "BN">("all");
  const [sortKey, setSortKey] = useState<SortKey>("invoice_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  const viewSourcePdf = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("invoice-sources")
      .createSignedUrl(path, 60 * 5);
    if (error || !data?.signedUrl) return toast.error("No se pudo abrir el PDF de origen");
    window.open(data.signedUrl, "_blank");
  };

  const openDelete = (inv: any) => {
    setDeleteOpen(inv);
    setDeleteConfirmText("");
  };

  const confirmDelete = async () => {
    if (!deleteOpen) return;
    if (deleteConfirmText.trim() !== deleteOpen.invoice_number) {
      return toast.error("El número de factura no coincide");
    }
    setDeleting(true);
    try {
      if (deleteOpen.payment_proof_url) {
        await supabase.storage
          .from("payment-proofs")
          .remove([deleteOpen.payment_proof_url]);
      }
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", deleteOpen.id);
      if (error) throw error;
      toast.success(`Factura ${deleteOpen.invoice_number} eliminada`);
      setDeleteOpen(null);
      setDeleteConfirmText("");
      await reload();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  // helper: extrae conceptos de las líneas
  const conceptsOf = (inv: any): string => {
    const items = (inv.line_items || []) as any[];
    return items.map((li) => li?.description || "").join(" | ");
  };

  // filtrado + orden
  const filtered = useMemo(() => {
    const cf = clientFilter.trim().toLowerCase();
    const xf = conceptFilter.trim().toLowerCase();
    let list = rows.filter((r) => {
      const okClient = !cf || (r.client_name || "").toLowerCase().includes(cf);
      const okConcept = !xf || conceptsOf(r).toLowerCase().includes(xf);
      const okIssuer = issuerFilter === "all" || r.issuer_id === issuerFilter;
      return okClient && okConcept && okIssuer;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      let va: any = a[sortKey];
      let vb: any = b[sortKey];
      if (sortKey === "total") {
        va = parseFloat(a.total) || 0;
        vb = parseFloat(b.total) || 0;
        return (va - vb) * dir;
      }
      if (sortKey === "invoice_number") {
        // orden natural por seq dentro del nº
        const na = parseInt(String(a.invoice_number).replace(/\D/g, ""), 10) || 0;
        const nb = parseInt(String(b.invoice_number).replace(/\D/g, ""), 10) || 0;
        return (na - nb) * dir;
      }
      va = (va ?? "").toString().toLowerCase();
      vb = (vb ?? "").toString().toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return list;
  }, [rows, clientFilter, conceptFilter, issuerFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "total" || key === "invoice_date" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-50" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 inline ml-1" />
      : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };

  const exportXlsx = () => {
    if (filtered.length === 0) return toast.error("No hay facturas para exportar");
    const data = filtered.map((r) => ({
      Número: r.invoice_number,
      Fecha: r.invoice_date,
      Cliente: r.client_name,
      "NIF/CIF": r.client_tax_id || "",
      Tipo: r.invoice_type,
      Conceptos: conceptsOf(r),
      Subtotal: parseFloat(r.subtotal) || 0,
      IVA: parseFloat(r.vat_amount) || 0,
      IRPF: parseFloat(r.irpf_amount) || 0,
      Total: parseFloat(r.total) || 0,
      Cobrada: r.paid ? "Sí" : "No",
      "Fecha cobro": r.paid_at || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 16 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 10 },
      { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 9 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturas");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `facturas-${stamp}.xlsx`);
  };

  const totalFiltered = filtered.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="container py-3 flex items-center gap-2 flex-wrap">
          <Button asChild variant="ghost" size="icon">
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-base sm:text-xl font-bold flex-1 min-w-0 truncate">Facturas emitidas</h1>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm">
              <Link to="/clientes">Ver por clientes</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/historial"><FileText className="h-4 w-4 mr-2" />Historial</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={exportXlsx}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />Exportar Excel
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-6 space-y-4">
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
            <div>
              <Label className="text-xs">Filtrar por cliente</Label>
              <div className="relative">
                <Input
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  placeholder="Ej. KIA, Mahou…"
                />
                {clientFilter && (
                  <button
                    onClick={() => setClientFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpiar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Filtrar por concepto</Label>
              <div className="relative">
                <Input
                  value={conceptFilter}
                  onChange={(e) => setConceptFilter(e.target.value)}
                  placeholder="Ej. ponencia, gastos, sponsor…"
                />
                {conceptFilter && (
                  <button
                    onClick={() => setConceptFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpiar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Emisor</Label>
              <div className="flex gap-1">
                {(["all", "JHE", "BN"] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    size="sm"
                    variant={issuerFilter === v ? "default" : "outline"}
                    onClick={() => setIssuerFilter(v)}
                  >
                    {v === "all" ? "Todos" : v === "JHE" ? "Jon" : "Bright"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="text-sm text-muted-foreground md:text-right">
              {filtered.length} de {rows.length} · Total:{" "}
              <strong className="text-foreground">{eur(totalFiltered)}</strong>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="table-wrap" style={{ maxHeight: "calc(100vh - 280px)" }}>
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-muted sticky top-0 z-10">
                <tr className="text-left">
                  <th className="p-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("invoice_number")}>
                    Número<SortIcon k="invoice_number" />
                  </th>
                  <th className="p-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("invoice_date")}>
                    Fecha<SortIcon k="invoice_date" />
                  </th>
                  <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort("client_name")}>
                    Cliente<SortIcon k="client_name" />
                  </th>
                  <th className="p-3 whitespace-nowrap">Emisor</th>
                  <th className="p-3 whitespace-nowrap">Tipo</th>
                  <th className="p-3 text-right whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort("total")}>
                    Total<SortIcon k="total" />
                  </th>
                  <th className="p-3 text-center whitespace-nowrap">Cobro</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Sin resultados</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-mono whitespace-nowrap">{r.invoice_number}</td>
                    <td className="p-3 whitespace-nowrap">{r.invoice_date}</td>
                    <td className="p-3">{r.client_name}</td>
                    <td className="p-3">
                      {r.issuer_id === "BN" ? (
                        <Badge className="bg-purple-600 hover:bg-purple-600">Bright</Badge>
                      ) : (
                        <Badge variant="secondary">Jon</Badge>
                      )}
                    </td>
                    <td className="p-3 capitalize">{r.invoice_type}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">{eur(parseFloat(r.total))}</td>
                    <td className="p-3 text-center">
                      {r.paid ? (
                        <div className="flex items-center justify-center gap-2">
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 whitespace-nowrap">
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
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => undoPaid(r)}
                              title="Deshacer cobro"
                            >
                              <Undo2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : isAdmin ? (
                        <Button size="sm" variant="outline" onClick={() => openPaid(r)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />Cobrada
                        </Button>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => downloadPdf(r)}>
                          <FileDown className="h-4 w-4 mr-1" />PDF
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDelete(r)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar factura"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      <Dialog open={!!deleteOpen} onOpenChange={(o) => !o && setDeleteOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Eliminar factura {deleteOpen?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-semibold text-destructive">Esta acción no se puede deshacer.</p>
              <p className="text-muted-foreground mt-1">
                Se eliminará la factura <strong>{deleteOpen?.invoice_number}</strong> de{" "}
                <strong>{deleteOpen?.client_name}</strong> por{" "}
                <strong>{deleteOpen ? eur(parseFloat(deleteOpen.total)) : ""}</strong>.
                El número quedará libre y será reutilizado en la próxima factura del mismo emisor y año.
              </p>
            </div>
            <div>
              <Label>
                Para confirmar, escribe el número de factura:{" "}
                <span className="font-mono font-semibold">{deleteOpen?.invoice_number}</span>
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteOpen?.invoice_number}
                className="mt-1 font-mono"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting || deleteConfirmText.trim() !== deleteOpen?.invoice_number}
            >
              {deleting ? "Eliminando…" : "Eliminar definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesList;
