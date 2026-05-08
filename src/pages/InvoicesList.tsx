import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";
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
  RotateCcw,
  Pencil,
  Eye,
  TrendingUp,
} from "lucide-react";
import { eur } from "@/lib/invoiceCalc";
import { generateInvoicePdf, type Issuer } from "@/lib/pdf";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type SortKey = "invoice_number" | "invoice_date" | "client_name" | "total";
type SortDir = "asc" | "desc";

const InvoicesList = () => {
  const navigate = useNavigate();
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
  const [rectifyOpen, setRectifyOpen] = useState<any | null>(null);
  const [rectifying, setRectifying] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // filtros y orden
  const [clientFilter, setClientFilter] = useState("");
  const [conceptFilter, setConceptFilter] = useState("");
  const [numberFilter, setNumberFilter] = useState("");
  const [issuerFilter, setIssuerFilter] = useState<"all" | "JHE" | "BN">("all");
  const [paidFilter, setPaidFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [overdueDays, setOverdueDays] = useState<"all" | "20" | "30">("30");
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

  const renderPdf = (inv: any, mode: "save" | "open") => {
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
      invoice_type: inv.invoice_type,
      is_rectificative: inv.is_rectificative,
      rectified_invoice_number: inv.rectified_invoice_number,
    }, mode);
  };

  const downloadPdf = (inv: any) => renderPdf(inv, "save");
  const viewPdf = (inv: any) => renderPdf(inv, "open");

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

  const confirmRectify = async () => {
    if (!rectifyOpen) return;
    setRectifying(true);
    try {
      const inv = rectifyOpen;
      const year = parseInt(inv.invoice_date.slice(0, 4));
      // Get next seq (check gaps first)
      const { data: gapData } = await supabase.rpc("find_invoice_gaps", {
        _issuer_id: inv.issuer_id,
        _year: year,
      });
      let seq: number;
      if (gapData && gapData.length > 0) {
        seq = gapData[0].missing_seq;
      } else {
        const { data: seqData, error: seqErr } = await supabase.rpc("next_invoice_seq", {
          _issuer_id: inv.issuer_id,
          _year: year,
        });
        if (seqErr || typeof seqData !== "number") throw seqErr || new Error("No seq");
        seq = seqData;
      }
      const invoiceNumber = `${inv.issuer_id}-${year}-${String(seq).padStart(3, "0")}`;

      // Create rectificative line items (negative amounts)
      const originalItems = (inv.line_items || []) as any[];
      const rectItems = originalItems.map((li: any) => ({
        ...li,
        unit_price: -Math.abs(li.unit_price || 0),
        total: -Math.abs(li.total || 0),
      }));

      const payload = {
        issuer_id: inv.issuer_id,
        invoice_number: invoiceNumber,
        year,
        seq,
        invoice_type: inv.invoice_type,
        invoice_date: new Date().toISOString().slice(0, 10),
        parent_invoice_number: inv.parent_invoice_number || null,
        our_reference: inv.our_reference || null,
        their_order: inv.their_order || null,
        client_name: inv.client_name,
        client_tax_id: inv.client_tax_id || null,
        client_address_line1: inv.client_address_line1 || null,
        client_address_line2: inv.client_address_line2 || null,
        client_city_zip: inv.client_city_zip || null,
        client_country: inv.client_country || null,
        client_is_foreign: inv.client_is_foreign,
        client_is_canary: inv.client_is_canary,
        line_items: rectItems as any,
        subtotal: -Math.abs(parseFloat(inv.subtotal) || 0),
        vat_rate: parseFloat(inv.vat_rate) || 0,
        vat_label: inv.vat_label,
        vat_amount: -Math.abs(parseFloat(inv.vat_amount) || 0),
        irpf_rate: parseFloat(inv.irpf_rate) || 0,
        irpf_amount: -Math.abs(parseFloat(inv.irpf_amount) || 0),
        total: -Math.abs(parseFloat(inv.total) || 0),
        pre_payment_note: null,
        post_payment_note: null,
        is_rectificative: true,
        rectified_invoice_number: inv.invoice_number,
      };

      const { error } = await supabase.from("invoices").insert(payload);
      if (error) throw error;

      // Auto-generate PDF
      const issuer = issuers[inv.issuer_id];
      if (issuer) {
        generateInvoicePdf({
          issuer,
          invoice_number: invoiceNumber,
          invoice_date: payload.invoice_date,
          our_reference: payload.our_reference,
          their_order: payload.their_order,
          client_name: payload.client_name,
          client_tax_id: payload.client_tax_id,
          client_address_line1: payload.client_address_line1,
          client_address_line2: payload.client_address_line2,
          client_city_zip: payload.client_city_zip,
          client_country: payload.client_country,
          line_items: rectItems,
          subtotal: payload.subtotal,
          vat_rate: payload.vat_rate,
          vat_label: payload.vat_label,
          vat_amount: payload.vat_amount,
          irpf_rate: payload.irpf_rate,
          irpf_amount: payload.irpf_amount,
          total: payload.total,
          pre_payment_note: null,
          invoice_type: payload.invoice_type,
          is_rectificative: true,
          rectified_invoice_number: inv.invoice_number,
        });
      }

      toast.success(`Factura rectificativa ${invoiceNumber} creada`);
      setRectifyOpen(null);
      await reload();
    } catch (e: any) {
      toast.error(e.message || "Error al rectificar");
    } finally {
      setRectifying(false);
    }
  };

  const conceptsOf = (inv: any): string => {
    const items = (inv.line_items || []) as any[];
    return items.map((li) => li?.description || "").join(" | ");
  };

  // filtrado + orden
  const filtered = useMemo(() => {
    const cf = clientFilter.trim().toLowerCase();
    const xf = conceptFilter.trim().toLowerCase();
    const nf = numberFilter.trim().toLowerCase();
    let list = rows.filter((r) => {
      const okClient = !cf || (r.client_name || "").toLowerCase().includes(cf);
      const okConcept = !xf || conceptsOf(r).toLowerCase().includes(xf);
      const okNumber = !nf || (r.invoice_number || "").toLowerCase().includes(nf);
      const okIssuer = issuerFilter === "all" || r.issuer_id === issuerFilter;
      const okPaid =
        paidFilter === "all" ||
        (paidFilter === "paid" ? r.paid : !r.paid);
      let okType = true;
      if (typeFilter.size > 0) {
        okType = (r.is_rectificative && typeFilter.has("rectificativa")) ||
                 (!r.is_rectificative && typeFilter.has(r.invoice_type));
      }
      return okClient && okConcept && okNumber && okIssuer && okPaid && okType;
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
  }, [rows, clientFilter, conceptFilter, numberFilter, issuerFilter, paidFilter, typeFilter, sortKey, sortDir]);

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

  // Facturas pendientes con horizonte configurable
  const overdueInvoices = useMemo(() => {
    const unpaid = rows.filter((r) => !r.paid);
    if (overdueDays === "all") return unpaid;
    const days = parseInt(overdueDays, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return unpaid.filter((r) => new Date(r.invoice_date) < cutoff);
  }, [rows, overdueDays]);

  // Estadísticas: tiempo medio de cobro por grupo
  const paymentStats = useMemo(() => {
    const groups: Record<string, { label: string; types: string[] }> = {
      ponencias: { label: "Ponencias", types: ["ponencia", "mixta"] },
      gastos: { label: "Gastos", types: ["gastos"] },
      formaciones: { label: "Formaciones", types: ["formacion"] },
      sponsor: { label: "Sponsor", types: ["sponsor"] },
    };
    const result: { key: string; label: string; avgDays: number | null; count: number }[] = [];
    for (const [key, g] of Object.entries(groups)) {
      const paid = rows.filter(
        (r) => r.paid && r.paid_at && !r.is_rectificative && g.types.includes(r.invoice_type)
      );
      if (paid.length === 0) {
        result.push({ key, label: g.label, avgDays: null, count: 0 });
        continue;
      }
      const totalDays = paid.reduce((s, r) => {
        const issued = new Date(r.invoice_date).getTime();
        const paidAt = new Date(r.paid_at).getTime();
        return s + Math.max(0, (paidAt - issued) / 86400000);
      }, 0);
      result.push({ key, label: g.label, avgDays: totalDays / paid.length, count: paid.length });
    }
    return result;
  }, [rows]);

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
        <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-4">
          <Card className="p-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-sm flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                    {overdueInvoices.length} pendiente{overdueInvoices.length === 1 ? "" : "s"}
                    {overdueDays !== "all" && ` >${overdueDays}d`}
                  </p>
                  <div className="flex gap-1">
                    {(["20", "30", "all"] as const).map((v) => (
                      <Button
                        key={v}
                        type="button"
                        size="sm"
                        variant={overdueDays === v ? "default" : "outline"}
                        onClick={() => setOverdueDays(v)}
                      >
                        {v === "all" ? "Todas" : `${v}d`}
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-lg font-bold text-amber-900 dark:text-amber-200 mt-1">
                  {eur(overdueInvoices.reduce((s, r) => s + (parseFloat(r.total) || 0), 0))}
                </p>
                <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-400 max-h-40 overflow-y-auto pr-2">
                  {overdueInvoices.map((inv) => {
                    const days = Math.floor((Date.now() - new Date(inv.invoice_date).getTime()) / 86400000);
                    return (
                      <li key={inv.id} className="font-mono text-xs">
                        {inv.invoice_number} — {inv.client_name} — {eur(parseFloat(inv.total))} — {days}d
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Tiempo medio de cobro (días)</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {paymentStats.map((s) => (
                <div key={s.key} className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-bold">
                    {s.avgDays === null ? "—" : Math.round(s.avgDays)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.count} cobrada{s.count === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-3">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <div>
              <Label className="text-xs">Nº factura</Label>
              <div className="relative">
                <Input
                  value={numberFilter}
                  onChange={(e) => setNumberFilter(e.target.value)}
                  placeholder="JHE-…"
                  className="h-8 w-32 text-sm pr-7"
                />
                {numberFilter && (
                  <button
                    onClick={() => setNumberFilter("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpiar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Cliente</Label>
              <div className="relative">
                <Input
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  placeholder="Cliente…"
                  className="h-8 w-32 text-sm pr-7"
                />
                {clientFilter && (
                  <button
                    onClick={() => setClientFilter("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpiar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Concepto</Label>
              <div className="relative">
                <Input
                  value={conceptFilter}
                  onChange={(e) => setConceptFilter(e.target.value)}
                  placeholder="Concepto…"
                  className="h-8 w-32 text-sm pr-7"
                />
                {conceptFilter && (
                  <button
                    onClick={() => setConceptFilter("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpiar"
                  >
                    <X className="h-3.5 w-3.5" />
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
            <div>
              <Label className="text-xs">Cobro</Label>
              <div className="flex gap-1">
                {(["all", "unpaid", "paid"] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    size="sm"
                    variant={paidFilter === v ? "default" : "outline"}
                    onClick={() => setPaidFilter(v)}
                  >
                    {v === "all" ? "Todas" : v === "unpaid" ? "No cobradas" : "Cobradas"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Tipo de factura</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="justify-between min-w-[160px]">
                    <span className="truncate">
                      {typeFilter.size === 0
                        ? "Todas"
                        : `${typeFilter.size} seleccionada${typeFilter.size === 1 ? "" : "s"}`}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 ml-2 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-1">
                    {([
                      ["ponencia", "Ponencia"],
                      ["mixta", "Mixta"],
                      ["formacion", "Formación"],
                      ["gastos", "Gastos"],
                      ["sponsor", "Sponsor"],
                      ["rectificativa", "Rectificativas"],
                    ] as const).map(([v, label]) => {
                      const checked = typeFilter.has(v);
                      return (
                        <label
                          key={v}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => {
                              setTypeFilter((prev) => {
                                const next = new Set(prev);
                                if (c) next.add(v);
                                else next.delete(v);
                                return next;
                              });
                            }}
                          />
                          {label}
                        </label>
                      );
                    })}
                    {typeFilter.size > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full mt-1"
                        onClick={() => setTypeFilter(new Set())}
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
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
                    <td className="p-3 capitalize">
                      {r.is_rectificative ? (
                        <Badge variant="outline" className="border-red-400 text-red-600 dark:text-red-400">Rectificativa</Badge>
                      ) : r.invoice_type === "formacion" ? "Formación" : r.invoice_type}
                    </td>
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
                        <Button size="sm" variant="outline" onClick={() => viewPdf(r)} title="Ver factura">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => downloadPdf(r)}>
                          <FileDown className="h-4 w-4 mr-1" />PDF
                        </Button>
                        {r.source_pdf_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewSourcePdf(r.source_pdf_url)}
                            title={r.source_pdf_name || "PDF de origen"}
                          >
                            <FileText className="h-4 w-4 mr-1" />Origen
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/nueva?issuer=${r.issuer_id}&type=${r.invoice_type}&edit=${r.id}`)}
                            title="Editar factura"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && !r.is_rectificative && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRectifyOpen(r)}
                            title="Factura rectificativa"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
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

      <Dialog open={!!rectifyOpen} onOpenChange={(o) => !o && setRectifyOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Rectificar factura {rectifyOpen?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
              <p className="text-muted-foreground">
                Se creará una <strong>factura rectificativa</strong> con los mismos conceptos e importes en <strong>negativo</strong>,
                anulando la factura original <strong>{rectifyOpen?.invoice_number}</strong> de{" "}
                <strong>{rectifyOpen?.client_name}</strong> por{" "}
                <strong>{rectifyOpen ? eur(parseFloat(rectifyOpen.total)) : ""}</strong>.
              </p>
              <p className="text-muted-foreground mt-2">
                Se descargará automáticamente el PDF de la factura rectificativa.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRectifyOpen(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmRectify} disabled={rectifying}>
              {rectifying ? "Creando…" : "Crear rectificativa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesList;
