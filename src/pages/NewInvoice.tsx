import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, FileDown, Camera, Loader2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { computeSubtotal, computeTaxes, eur, round2, type LineItem } from "@/lib/invoiceCalc";
import { COMPLEMENT_INDENTED_LINE, PRE_PAYMENT_NOTES, POST_PAYMENT_NOTE, ponenciaDescription, type PrePaymentKey } from "@/lib/invoiceTexts";
import { generateInvoicePdf, type Issuer } from "@/lib/pdf";

type InvoiceType = "ponencia" | "complemento" | "sponsor";

const NewInvoice = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const issuerId = (params.get("issuer") || "JHE") as "JHE" | "BN";
  const type = (params.get("type") || "ponencia") as InvoiceType;

  const [issuer, setIssuer] = useState<Issuer | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewNumber, setPreviewNumber] = useState<string>("");

  // Cabecera
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [ourReference, setOurReference] = useState("");
  const [theirOrder, setTheirOrder] = useState("");

  // Cliente
  const [clientName, setClientName] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");
  const [clientAddr1, setClientAddr1] = useState("");
  const [clientAddr2, setClientAddr2] = useState("");
  const [clientCityZip, setClientCityZip] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [isForeign, setIsForeign] = useState(false);
  const [isCanary, setIsCanary] = useState(false);

  // Tipo-específicos
  const [ponenciaDate, setPonenciaDate] = useState(""); // yyyy-mm-dd, descripción de ponencia
  const [parentInvoice, setParentInvoice] = useState("");

  // Líneas
  const [items, setItems] = useState<LineItem[]>([
    { description: "", unit_price: 0, quantity: 1, total: 0 },
  ]);

  // Notas
  const [prePaymentKey, setPrePaymentKey] = useState<PrePaymentKey>("none");

  // Extracción IA desde captura
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = async (file: File) => {
    setExtracting(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("extract-client", {
        body: { imageBase64: base64, mimeType: file.type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data.client_name) setClientName(data.client_name);
      if (data.client_tax_id) setClientTaxId(data.client_tax_id);
      if (data.client_address_line1) setClientAddr1(data.client_address_line1);
      if (data.client_address_line2) setClientAddr2(data.client_address_line2);
      if (data.client_city_zip) setClientCityZip(data.client_city_zip);
      if (data.client_country) setClientCountry(data.client_country);
      if (typeof data.is_foreign === "boolean") {
        setIsForeign(data.is_foreign);
        if (data.is_foreign) setIsCanary(false);
      }
      if (typeof data.is_canary === "boolean") {
        setIsCanary(data.is_canary);
        if (data.is_canary) setIsForeign(false);
      }
      toast.success("Datos del cliente extraídos");
    } catch (e: any) {
      toast.error(e.message || "Error extrayendo datos");
    } finally {
      setExtracting(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) await handleImageFile(file);
    }
  };

  // Cargar emisor + preview número
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("issuers").select("*").eq("id", issuerId).single();
      if (data) setIssuer(data as Issuer);
      const year = parseInt(invoiceDate.slice(0, 4));
      const { data: seqData } = await supabase.rpc("next_invoice_seq", { _issuer_id: issuerId, _year: year });
      if (typeof seqData === "number") {
        setPreviewNumber(`${issuerId}-${year}-${String(seqData).padStart(3, "0")}`);
      }
    })();
  }, [issuerId, invoiceDate]);

  // Auto-rellenar primera línea según tipo
  useEffect(() => {
    if (type === "ponencia") {
      setItems((prev) => {
        const first = prev[0];
        const desc = ponenciaDate ? ponenciaDescription(ponenciaDate) : first.description;
        return [{ ...first, description: desc }, ...prev.slice(1)];
      });
    } else if (type === "complemento") {
      setItems((prev) => {
        // Primera línea: encabezado de la ponencia (sin importes)
        const headerDesc = ponenciaDate ? ponenciaDescription(ponenciaDate) : prev[0]?.description || "";
        const second: LineItem = {
          description: COMPLEMENT_INDENTED_LINE,
          unit_price: prev[1]?.unit_price ?? 0,
          quantity: prev[1]?.quantity ?? 1,
          total: prev[1]?.total ?? 0,
          indented: true,
        };
        return [
          { description: headerDesc, unit_price: 0, quantity: 0, total: 0, parent_header: true },
          second,
        ];
      });
    }
    // sponsor: dejar libre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ponenciaDate]);

  const subtotal = useMemo(() => computeSubtotal(items), [items]);
  const taxes = useMemo(() => computeTaxes(subtotal, { isForeign, isCanary }), [subtotal, isForeign, isCanary]);
  const total = useMemo(() => round2(subtotal + taxes.vat_amount - taxes.irpf_amount), [subtotal, taxes]);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const merged = { ...it, ...patch };
        if (!merged.parent_header) {
          merged.total = round2((merged.unit_price || 0) * (merged.quantity || 0));
        }
        return merged;
      }),
    );
  };

  const addItem = () => setItems((p) => [...p, { description: "", unit_price: 0, quantity: 1, total: 0 }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const handleSave = async (alsoPdf: boolean) => {
    if (!issuer) return;
    if (!clientName.trim()) {
      toast.error("Falta el nombre del cliente");
      return;
    }
    if (type === "complemento" && !parentInvoice.trim()) {
      toast.error("Falta el número de la factura padre");
      return;
    }
    setLoading(true);
    try {
      const year = parseInt(invoiceDate.slice(0, 4));
      const { data: seq, error: seqErr } = await supabase.rpc("next_invoice_seq", {
        _issuer_id: issuerId,
        _year: year,
      });
      if (seqErr || typeof seq !== "number") throw seqErr || new Error("No seq");
      const invoiceNumber = `${issuerId}-${year}-${String(seq).padStart(3, "0")}`;

      const prePaymentText = PRE_PAYMENT_NOTES[prePaymentKey].text || null;

      const payload = {
        issuer_id: issuerId,
        invoice_number: invoiceNumber,
        year,
        seq,
        invoice_type: type,
        invoice_date: invoiceDate,
        parent_invoice_number: type === "complemento" ? parentInvoice : null,
        our_reference: ourReference || null,
        their_order: theirOrder || null,
        client_name: clientName,
        client_tax_id: clientTaxId || null,
        client_address_line1: clientAddr1 || null,
        client_address_line2: clientAddr2 || null,
        client_city_zip: clientCityZip || null,
        client_country: clientCountry || null,
        client_is_foreign: isForeign,
        client_is_canary: isCanary,
        line_items: items as any,
        subtotal,
        vat_rate: taxes.vat_rate,
        vat_label: taxes.vat_label,
        vat_amount: taxes.vat_amount,
        irpf_rate: taxes.irpf_rate,
        irpf_amount: taxes.irpf_amount,
        total,
        pre_payment_note: prePaymentText,
        post_payment_note: POST_PAYMENT_NOTE,
      };

      const { error } = await supabase.from("invoices").insert(payload);
      if (error) throw error;

      toast.success(`Factura ${invoiceNumber} creada`);

      if (alsoPdf) {
        generateInvoicePdf({
          issuer,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          our_reference: ourReference,
          their_order: theirOrder,
          client_name: clientName,
          client_tax_id: clientTaxId,
          client_address_line1: clientAddr1,
          client_address_line2: clientAddr2,
          client_city_zip: clientCityZip,
          client_country: clientCountry,
          line_items: items,
          subtotal,
          vat_rate: taxes.vat_rate,
          vat_label: taxes.vat_label,
          vat_amount: taxes.vat_amount,
          irpf_rate: taxes.irpf_rate,
          irpf_amount: taxes.irpf_amount,
          total,
          pre_payment_note: prePaymentText,
        });
      }

      navigate("/facturas");
    } catch (e: any) {
      toast.error(e.message || "Error guardando");
    } finally {
      setLoading(false);
    }
  };

  const typeLabel = { ponencia: "Ponencia", complemento: "Complemento", sponsor: "Sponsor" }[type];

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to={issuerId === "JHE" ? "/jon" : "/"}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Nueva factura · {typeLabel}</h1>
            <p className="text-sm text-muted-foreground">
              Próximo número: <span className="font-mono font-semibold text-foreground">{previewNumber || "..."}</span>
            </p>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 max-w-4xl">
        {/* Datos básicos */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Datos de la factura</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Fecha de factura</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div>
              <Label>Nuestra referencia (opcional)</Label>
              <Input value={ourReference} onChange={(e) => setOurReference(e.target.value)} />
            </div>
            <div>
              <Label>Según su pedido (opcional)</Label>
              <Input value={theirOrder} onChange={(e) => setTheirOrder(e.target.value)} />
            </div>
          </div>

          {type === "ponencia" && (
            <div>
              <Label>Fecha de la ponencia</Label>
              <Input type="date" value={ponenciaDate} onChange={(e) => setPonenciaDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                Generará: <em>{ponenciaDate ? ponenciaDescription(ponenciaDate) : "Ponencia DD/MM/AAAA; La IA, ola o tsunami?"}</em>
              </p>
            </div>
          )}

          {type === "complemento" && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nº factura padre *</Label>
                <Input placeholder="JHE-2025-172" value={parentInvoice} onChange={(e) => setParentInvoice(e.target.value)} />
              </div>
              <div>
                <Label>Fecha de la ponencia (encabezado)</Label>
                <Input type="date" value={ponenciaDate} onChange={(e) => setPonenciaDate(e.target.value)} />
              </div>
            </div>
          )}
        </Card>

        {/* Cliente */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Cliente</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre / Razón social *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <Label>CIF/NIF</Label>
              <Input value={clientTaxId} onChange={(e) => setClientTaxId(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Dirección</Label>
              <Input value={clientAddr1} onChange={(e) => setClientAddr1(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Dirección 2 (opcional)</Label>
              <Input value={clientAddr2} onChange={(e) => setClientAddr2(e.target.value)} />
            </div>
            <div>
              <Label>CP y ciudad</Label>
              <Input value={clientCityZip} onChange={(e) => setClientCityZip(e.target.value)} />
            </div>
            <div>
              <Label>País (si extranjero)</Label>
              <Input value={clientCountry} onChange={(e) => setClientCountry(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={isForeign} onCheckedChange={(v) => { setIsForeign(!!v); if (v) setIsCanary(false); }} />
              <span className="text-sm">Cliente extranjero (sin IVA ni IRPF)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={isCanary} onCheckedChange={(v) => { setIsCanary(!!v); if (v) setIsForeign(false); }} />
              <span className="text-sm">Canarias (IGIC 7% en lugar de IVA)</span>
            </label>
          </div>
        </Card>

        {/* Líneas */}
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Conceptos</h2>
            <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Añadir línea</Button>
          </div>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-6">
                  <Textarea
                    rows={2}
                    value={it.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    placeholder="Descripción"
                    className={it.indented ? "pl-6" : ""}
                  />
                  <div className="flex gap-3 mt-1 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer text-muted-foreground">
                      <Checkbox checked={!!it.indented} onCheckedChange={(v) => updateItem(i, { indented: !!v })} />
                      Sangría
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-muted-foreground">
                      <Checkbox checked={!!it.parent_header} onCheckedChange={(v) => updateItem(i, { parent_header: !!v })} />
                      Solo encabezado (sin importes)
                    </label>
                  </div>
                </div>
                <div className="col-span-2">
                  <Input type="number" step="0.01" disabled={it.parent_header}
                    value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-1">
                  <Input type="number" step="1" disabled={it.parent_header}
                    value={it.quantity} onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2 text-right pt-2 font-medium">
                  {it.parent_header ? "—" : eur(it.total)}
                </div>
                <div className="col-span-1">
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-1 text-right">
            <div>Subtotal: <span className="font-semibold">{eur(subtotal)}</span></div>
            {taxes.vat_amount > 0 && (
              <div>{taxes.vat_label} {taxes.vat_rate}%: <span className="font-semibold">{eur(taxes.vat_amount)}</span></div>
            )}
            {taxes.irpf_amount > 0 && (
              <div>IRPF {taxes.irpf_rate}%: <span className="font-semibold">-{eur(taxes.irpf_amount)}</span></div>
            )}
            <div className="text-lg pt-2">TOTAL: <span className="font-bold">{eur(total)}</span></div>
          </div>
        </Card>

        {/* Notas */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Texto antes de la forma de pago</h2>
          <Select value={prePaymentKey} onValueChange={(v) => setPrePaymentKey(v as PrePaymentKey)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRE_PAYMENT_NOTES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {prePaymentKey !== "none" && (
            <div className="text-sm text-muted-foreground italic whitespace-pre-line bg-muted p-3 rounded">
              {PRE_PAYMENT_NOTES[prePaymentKey].text}
            </div>
          )}
          <div className="text-xs text-muted-foreground pt-2">
            <strong>Bajo la forma de pago siempre aparecerá:</strong>
            <p className="italic mt-1 whitespace-pre-line">{POST_PAYMENT_NOTE}</p>
          </div>
        </Card>

        <div className="flex gap-3 justify-end sticky bottom-4">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
            Guardar
          </Button>
          <Button onClick={() => handleSave(true)} disabled={loading}>
            <FileDown className="h-4 w-4 mr-2" />Guardar y descargar PDF
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NewInvoice;
