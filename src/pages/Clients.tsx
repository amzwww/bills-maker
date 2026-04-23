import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileDown, CheckCircle2, Search, X, Pencil, Save } from "lucide-react";
import { eur } from "@/lib/invoiceCalc";
import { generateInvoicePdf, type Issuer } from "@/lib/pdf";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Invoice = any;

const Clients = () => {
  const { isAdmin } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [issuers, setIssuers] = useState<Record<string, Issuer>>({});
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [issuerFilter, setIssuerFilter] = useState<"all" | "JHE" | "BN">("all");
  const [editClient, setEditClient] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: invs }, { data: iss }] = await Promise.all([
        supabase.from("invoices").select("*").order("invoice_date", { ascending: false }),
        supabase.from("issuers").select("*"),
      ]);
      setInvoices(invs || []);
      const map: Record<string, Issuer> = {};
      (iss || []).forEach((i: any) => (map[i.id] = i));
      setIssuers(map);
    })();
  }, []);

  // Agrupar por cliente + emisor
  const clients = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        tax_id: string;
        issuer_id: string;
        count: number;
        total: number;
        paid: number;
        pending: number;
        invoices: Invoice[];
      }
    >();
    for (const inv of invoices) {
      const nameKey = (inv.client_name || "").trim().toLowerCase();
      if (!nameKey) continue;
      const key = `${inv.issuer_id}::${nameKey}`;
      const total = parseFloat(inv.total) || 0;
      const isPaid = !!inv.paid;
      const g =
        groups.get(key) ||
        {
          key,
          name: inv.client_name,
          tax_id: inv.client_tax_id || "",
          issuer_id: inv.issuer_id,
          count: 0,
          total: 0,
          paid: 0,
          pending: 0,
          invoices: [] as Invoice[],
        };
      g.count += 1;
      g.total += total;
      if (isPaid) g.paid += total;
      else g.pending += total;
      g.invoices.push(inv);
      groups.set(key, g);
    }
    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  }, [invoices]);

  const filteredClients = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    return clients.filter((c) => {
      if (issuerFilter !== "all" && c.issuer_id !== issuerFilter) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clients, nameFilter, issuerFilter]);

  const downloadPdf = (inv: Invoice) => {
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

  const current = clients.find((c) => c.key === openClient);

  const issuerBadge = (id: string) => {
    if (id === "JHE") return <Badge variant="secondary">Jon</Badge>;
    if (id === "BN") return <Badge className="bg-purple-600 hover:bg-purple-600 text-white">Bright</Badge>;
    return <Badge variant="outline">{id}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-xl font-bold">Clientes</h1>
          <div className="ml-auto text-sm text-muted-foreground">{filteredClients.length} de {clients.length}</div>
        </div>
      </header>
      <main className="container py-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Filtrar por nombre de cliente…"
              className="pl-9 pr-9"
            />
            {nameFilter && (
              <button
                onClick={() => setNameFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1 rounded-md border p-1 bg-card">
            {(["all", "JHE", "BN"] as const).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={issuerFilter === v ? "default" : "ghost"}
                onClick={() => setIssuerFilter(v)}
              >
                {v === "all" ? "Todos" : v === "JHE" ? "Jon" : "Bright"}
              </Button>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="p-3">Cliente</th>
                <th className="p-3">Emisor</th>
                <th className="p-3">NIF / CIF</th>
                <th className="p-3 text-right">Facturas</th>
                <th className="p-3 text-right">Cobrado</th>
                <th className="p-3 text-right">Pendiente</th>
                <th className="p-3 text-right">Total facturado</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Sin resultados</td></tr>
              )}
              {filteredClients.map((c) => (
                <tr key={c.key} className="border-t hover:bg-muted/40">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{issuerBadge(c.issuer_id)}</td>
                  <td className="p-3 text-muted-foreground">{c.tax_id}</td>
                  <td className="p-3 text-right">{c.count}</td>
                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">{eur(c.paid)}</td>
                  <td className="p-3 text-right text-amber-600 dark:text-amber-400">{eur(c.pending)}</td>
                  <td className="p-3 text-right">
                    <button
                      className="font-bold text-primary hover:underline"
                      onClick={() => setOpenClient(c.key)}
                    >
                      {eur(c.total)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>

      <Dialog open={!!openClient} onOpenChange={(o) => !o && setOpenClient(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{current?.name}</DialogTitle>
          </DialogHeader>
          {current && (
            <div className="space-y-2">
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>{current.count} facturas</span>·
                <span>Cobrado: {eur(current.paid)}</span>·
                <span>Pendiente: {eur(current.pending)}</span>·
                <span>Total: <strong className="text-foreground">{eur(current.total)}</strong></span>
              </div>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr className="text-left">
                      <th className="p-2">Número</th>
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-center">Estado</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.invoices.map((inv) => (
                      <tr key={inv.id} className="border-t">
                        <td className="p-2 font-mono">{inv.invoice_number}</td>
                        <td className="p-2">{inv.invoice_date}</td>
                        <td className="p-2 capitalize">{inv.invoice_type}</td>
                        <td className="p-2 text-right font-semibold">{eur(parseFloat(inv.total))}</td>
                        <td className="p-2 text-center">
                          {inv.paid ? (
                            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />Cobrada
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendiente</Badge>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <Button size="sm" variant="outline" onClick={() => downloadPdf(inv)}>
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
