import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Plus, Trash2, FileDown, Camera, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { classifyInvoice, computeSubtotal, computeTaxes, eur, round2, type LineItem } from "@/lib/invoiceCalc";
import { COMPLEMENT_INDENTED_LINE, EXPENSES_INDENTED_LINE, ponenciaDescription } from "@/lib/invoiceTexts";
import { generateInvoicePdf, type Issuer } from "@/lib/pdf";

type PastClient = {
  client_name: string;
  client_tax_id: string | null;
  client_address_line1: string | null;
  client_address_line2: string | null;
  client_city_zip: string | null;
  client_country: string | null;
  client_is_foreign: boolean;
  client_is_canary: boolean;
};

type QuoteType = "ponencia" | "complemento" | "sponsor" | "formacion";

const ISSUER_ID = "JHE";

const NewQuote = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialType = (params.get("type") || "ponencia") as QuoteType;
  const editId = params.get("edit");
  const [type, setType] = useState<QuoteType>(initialType);

  const [issuer, setIssuer] = useState<Issuer | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewNumber, setPreviewNumber] = useState<string>("");
  const [nextSeq, setNextSeq] = useState<number | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);

  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [ourReference, setOurReference] = useState("");
  const [theirOrder, setTheirOrder] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");
  const [clientAddr1, setClientAddr1] = useState("");
  const [clientAddr2, setClientAddr2] = useState("");
  const [addr2Enabled, setAddr2Enabled] = useState(false);
  const [clientCityZip, setClientCityZip] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [isForeign, setIsForeign] = useState(false);
  const [isCanary, setIsCanary] = useState(false);
  const [canaryIgicRate, setCanaryIgicRate] = useState<0 | 7 | 20>(0);
  const [isUniversity, setIsUniversity] = useState(false);
  const [uniAccountingOffice, setUniAccountingOffice] = useState("");
  const [uniManagingBody, setUniManagingBody] = useState("");
  const [uniProcessingUnit, setUniProcessingUnit] = useState("");

  const [ponenciaDate, setPonenciaDate] = useState("");
  const [parentInvoice, setParentInvoice] = useState("");

  const [items, setItems] = useState<LineItem[]>([
    { description: "", unit_price: 0, quantity: 1, total: 0 },
  ]);

  const [pastClients, setPastClients] = useState<PastClient[]>([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("invoices")
        .select("client_name, client_tax_id, client_address_line1, client_address_line2, client_city_zip, client_country, client_is_foreign, client_is_canary")
        .order("invoice_date", { ascending: false });
      if (!data) return;
      const seen = new Set<string>();
      const unique: PastClient[] = [];
      for (const r of data) {
        const key = (r.client_name || "").trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push(r as PastClient);
      }
      setPastClients(unique);
    })();
  }, []);

  // Load quote when editing
  useEffect(() => {
    if (!editId || editLoaded) return;
    (async () => {
      const { data: q } = await supabase.from("quotes" as any).select("*").eq("id", editId).single();
      if (!q) return;
      const quote = q as any;
      setEditLoaded(true);
      if (quote.invoice_type) setType(quote.invoice_type as QuoteType);
      setQuoteDate(quote.quote_date);
      setOurReference(quote.our_reference || "");
      setTheirOrder(quote.their_order || "");
      setClientName(quote.client_name);
      setClientTaxId(quote.client_tax_id || "");
      setClientAddr1(quote.client_address_line1 || "");
      if (quote.client_address_line2) {
        setClientAddr2(quote.client_address_line2);
        setAddr2Enabled(true);
      }
      setClientCityZip(quote.client_city_zip || "");
      setClientCountry(quote.client_country || "");
      setIsForeign(quote.client_is_foreign);
      setIsCanary(quote.client_is_canary);
      if (quote.client_is_canary && quote.vat_label === "IGIC") {
        const r = Number(quote.vat_rate);
        setCanaryIgicRate(r === 7 ? 7 : r === 20 ? 20 : 0);
      }
      setIsUniversity(!!quote.is_university);
      setUniAccountingOffice(quote.university_accounting_office || "");
      setUniManagingBody(quote.university_managing_body || "");
      setUniProcessingUnit(quote.university_processing_unit || "");
      setItems((quote.line_items as any[]) || [{ description: "", unit_price: 0, quantity: 1, total: 0 }]);
      setPreviewNumber(quote.quote_number);
    })();
  }, [editId, editLoaded]);

  const selectPastClient = useCallback((c: PastClient) => {
    setClientName(c.client_name);
    setClientTaxId(c.client_tax_id || "");
    setClientAddr1(c.client_address_line1 || "");
    setClientAddr2("");
    setAddr2Enabled(false);
    setClientCityZip(c.client_city_zip || "");
    setClientCountry(c.client_country || "");
    setIsForeign(c.client_is_foreign);
    setIsCanary(c.client_is_canary);
    setClientSearchOpen(false);
    toast.success(`Datos de "${c.client_name}" cargados`);
  }, []);

  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = async (file: File) => {
    setExtracting(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
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
      if (data.client_address_line2) { setClientAddr2(data.client_address_line2); setAddr2Enabled(true); }
      if (data.client_city_zip) setClientCityZip(data.client_city_zip);
      if (data.client_country) setClientCountry(data.client_country);
      if (typeof data.is_foreign === "boolean") { setIsForeign(data.is_foreign); if (data.is_foreign) setIsCanary(false); }
      if (typeof data.is_canary === "boolean") { setIsCanary(data.is_canary); if (data.is_canary) setIsForeign(false); }
      if (data.ponencia_date) setPonenciaDate(data.ponencia_date);
      if (typeof data.amount === "number" && data.amount > 0) {
        setItems((prev) => prev.map((it, i) => i === 0 ? { ...it, unit_price: data.amount, quantity: 1, total: data.amount } : it));
      }
      if (typeof data.expenses === "number" && data.expenses > 0) {
        setItems((prev) => {
          const expenseLine: LineItem = {
            description: EXPENSES_INDENTED_LINE,
            unit_price: data.expenses,
            quantity: 1,
            total: data.expenses,
            indented: true,
          };
          const existingIdx = prev.findIndex((it) => it.description === EXPENSES_INDENTED_LINE);
          if (existingIdx >= 0) {
            return prev.map((it, i) => i === existingIdx ? { ...it, ...expenseLine } : it);
          }
          const filtered = prev.filter((it, i) => i === 0 || (it.description || "").trim() !== "");
          return [...filtered, expenseLine];
        });
      }
      toast.success("Datos extraídos");
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

  // Cargar emisor + próximo número
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("issuers").select("*").eq("id", ISSUER_ID).single();
      if (data) setIssuer(data as Issuer);
      const year = parseInt(quoteDate.slice(0, 4));
      const { data: seqData } = await supabase.rpc("next_quote_seq" as any, { _issuer_id: ISSUER_ID, _year: year });
      if (typeof seqData === "number") setNextSeq(seqData);
    })();
  }, [quoteDate]);

  useEffect(() => {
    if (editId) return;
    const year = parseInt(quoteDate.slice(0, 4));
    if (typeof nextSeq === "number") {
      setPreviewNumber(`${ISSUER_ID}-PF-${year}-${String(nextSeq).padStart(3, "0")}`);
    }
  }, [nextSeq, quoteDate, editId]);

  // Auto líneas según tipo
  useEffect(() => {
    if (type === "ponencia") {
      setItems((prev) => {
        const first = prev[0];
        const desc = ponenciaDate ? ponenciaDescription(ponenciaDate) : first.description;
        return [{ ...first, description: desc }, ...prev.slice(1)];
      });
    } else if (type === "complemento") {
      setItems((prev) => {
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
        if (!merged.parent_header) merged.total = round2((merged.unit_price || 0) * (merged.quantity || 0));
        return merged;
      }),
    );
  };
  const addItem = () => setItems((p) => [...p, { description: "", unit_price: 0, quantity: 1, total: 0 }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const handleSave = async (alsoPdf: boolean) => {
    if (!issuer) return;
    if (!clientName.trim()) { toast.error("Falta el nombre del cliente"); return; }
    setLoading(true);
    try {
      const computedType = (type === "complemento" || type === "formacion") ? type : classifyInvoice(items);
      let quoteNumber: string;
      let seq: number;
      let year: number;

      if (editId) {
        quoteNumber = previewNumber;
        const m = quoteNumber.match(/-(\d{4})-(\d{3})$/);
        year = m ? parseInt(m[1]) : parseInt(quoteDate.slice(0, 4));
        seq = m ? parseInt(m[2]) : 0;

        const payload: any = {
          invoice_type: computedType,
          quote_date: quoteDate,
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
          is_university: isUniversity,
          university_accounting_office: isUniversity ? (uniAccountingOffice || null) : null,
          university_managing_body: isUniversity ? (uniManagingBody || null) : null,
          university_processing_unit: isUniversity ? (uniProcessingUnit || null) : null,
          line_items: items,
          subtotal,
          vat_rate: taxes.vat_rate,
          vat_label: taxes.vat_label,
          vat_amount: taxes.vat_amount,
          irpf_rate: taxes.irpf_rate,
          irpf_amount: taxes.irpf_amount,
          total,
        };
        const { error } = await supabase.from("quotes" as any).update(payload).eq("id", editId);
        if (error) throw error;
        toast.success(`Presupuesto ${quoteNumber} actualizado`);
      } else {
        year = parseInt(quoteDate.slice(0, 4));
        const { data: seqData, error: seqErr } = await supabase.rpc("next_quote_seq" as any, { _issuer_id: ISSUER_ID, _year: year });
        if (seqErr || typeof seqData !== "number") throw seqErr || new Error("No seq");
        seq = seqData;
        quoteNumber = `${ISSUER_ID}-PF-${year}-${String(seq).padStart(3, "0")}`;

        const payload: any = {
          issuer_id: ISSUER_ID,
          quote_number: quoteNumber,
          year,
          seq,
          invoice_type: computedType,
          quote_date: quoteDate,
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
          is_university: isUniversity,
          university_accounting_office: isUniversity ? (uniAccountingOffice || null) : null,
          university_managing_body: isUniversity ? (uniManagingBody || null) : null,
          university_processing_unit: isUniversity ? (uniProcessingUnit || null) : null,
          line_items: items,
          subtotal,
          vat_rate: taxes.vat_rate,
          vat_label: taxes.vat_label,
          vat_amount: taxes.vat_amount,
          irpf_rate: taxes.irpf_rate,
          irpf_amount: taxes.irpf_amount,
          total,
        };
        const { error } = await supabase.from("quotes" as any).insert(payload);
        if (error) throw error;
        toast.success(`Presupuesto ${quoteNumber} creado`);
      }

      if (alsoPdf) {
        generateInvoicePdf({
          issuer,
          invoice_number: quoteNumber,
          invoice_date: quoteDate,
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
          invoice_type: computedType,
          is_university: isUniversity,
          university_accounting_office: isUniversity ? uniAccountingOffice : undefined,
          university_managing_body: isUniversity ? uniManagingBody : undefined,
          university_processing_unit: isUniversity ? uniProcessingUnit : undefined,
          is_quote: true,
        });
      }
      navigate("/presupuestos");
    } catch (e: any) {
      toast.error(e.message || "Error guardando");
    } finally {
      setLoading(false);
    }
  };

  const typeLabel = { ponencia: "Ponencia", complemento: "Complemento", sponsor: "Sponsor", formacion: "Formación" }[type];

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to={editId ? "/presupuestos" : "/jon"}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{editId ? "Editar presupuesto" : "Nuevo presupuesto"} · {typeLabel}</h1>
            <p className="text-sm text-muted-foreground">
              {editId ? "Número:" : "Próximo número:"} <span className="font-mono font-semibold text-foreground">{previewNumber || "..."}</span>
            </p>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 max-w-4xl">
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Datos del presupuesto</h2>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as QuoteType)}>
              <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ponencia">Ponencia</SelectItem>
                <SelectItem value="complemento">Complemento</SelectItem>
                <SelectItem value="sponsor">Sponsor</SelectItem>
                <SelectItem value="formacion">Formación</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
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
          {(type === "ponencia" || type === "complemento") && (
            <div>
              <Label>Fecha de la ponencia</Label>
              <Input type="date" value={ponenciaDate} onChange={(e) => setPonenciaDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                Generará: <em>{ponenciaDate ? ponenciaDescription(ponenciaDate) : "Ponencia DD/MM/AAAA; La IA, ola o tsunami?"}</em>
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4" onPaste={handlePaste}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold">Cliente</h2>
            <div className="flex items-center gap-2">
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm"><Search className="h-4 w-4 mr-2" />Cargar cliente anterior</Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre o CIF…" />
                    <CommandList>
                      <CommandEmpty>Sin resultados</CommandEmpty>
                      <CommandGroup>
                        {pastClients.map((c, i) => (
                          <CommandItem key={i} value={`${c.client_name} ${c.client_tax_id || ""}`} onSelect={() => selectPastClient(c)}>
                            <div className="flex flex-col">
                              <span className="font-medium">{c.client_name}</span>
                              {c.client_tax_id && <span className="text-xs text-muted-foreground">{c.client_tax_id}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }} />
              <Button type="button" variant="secondary" size="sm" disabled={extracting} onClick={() => fileInputRef.current?.click()}>
                {extracting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                {extracting ? "Extrayendo..." : "Subir captura"}
              </Button>
              <span className="text-xs text-muted-foreground">o pega (Ctrl+V)</span>
            </div>
          </div>
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
              <div className="flex items-center gap-2 mb-1">
                <Checkbox checked={addr2Enabled} onCheckedChange={(v) => { setAddr2Enabled(!!v); if (!v) setClientAddr2(""); }} />
                <Label className="mb-0">Dirección 2 (opcional)</Label>
              </div>
              <Input value={clientAddr2} onChange={(e) => setClientAddr2(e.target.value)} disabled={!addr2Enabled} />
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
              <span className="text-sm">Canarias (IGIC 7%)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={isUniversity} onCheckedChange={(v) => { setIsUniversity(!!v); if (!v) { setUniAccountingOffice(""); setUniManagingBody(""); setUniProcessingUnit(""); } }} />
              <span className="text-sm">Universidad</span>
            </label>
          </div>
          {isUniversity && (
            <div className="grid md:grid-cols-3 gap-4 pt-2">
              <div><Label>Oficina contable</Label><Input value={uniAccountingOffice} onChange={(e) => setUniAccountingOffice(e.target.value)} /></div>
              <div><Label>Órgano Gestor</Label><Input value={uniManagingBody} onChange={(e) => setUniManagingBody(e.target.value)} /></div>
              <div><Label>Unidad Tramitadora</Label><Input value={uniProcessingUnit} onChange={(e) => setUniProcessingUnit(e.target.value)} /></div>
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Conceptos</h2>
            <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Añadir línea</Button>
          </div>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-6">
                  <Textarea rows={2} value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })}
                    placeholder="Descripción" className={it.indented ? "pl-6" : ""} />
                  <div className="flex gap-3 mt-1 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer text-muted-foreground">
                      <Checkbox checked={!!it.indented} onCheckedChange={(v) => updateItem(i, { indented: !!v })} />Sangría
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-muted-foreground">
                      <Checkbox checked={!!it.parent_header} onCheckedChange={(v) => updateItem(i, { parent_header: !!v })} />Solo encabezado
                    </label>
                  </div>
                </div>
                <div className="col-span-2">
                  <Input type="number" step="0.01" disabled={it.parent_header} value={it.unit_price}
                    onChange={(e) => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-1">
                  <Input type="number" step="1" disabled={it.parent_header} value={it.quantity}
                    onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2 text-right pt-2 font-medium">{it.parent_header ? "—" : eur(it.total)}</div>
                <div className="col-span-1">
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-1 text-right">
            <div>Subtotal: <span className="font-semibold">{eur(subtotal)}</span></div>
            {taxes.vat_amount > 0 && <div>{taxes.vat_label} {taxes.vat_rate}%: <span className="font-semibold">{eur(taxes.vat_amount)}</span></div>}
            {taxes.irpf_amount > 0 && <div>IRPF {taxes.irpf_rate}%: <span className="font-semibold">-{eur(taxes.irpf_amount)}</span></div>}
            <div className="text-lg pt-2">TOTAL: <span className="font-bold">{eur(total)}</span></div>
          </div>
        </Card>

        <div className="flex gap-3 justify-end sticky bottom-4">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>Guardar</Button>
          <Button onClick={() => handleSave(true)} disabled={loading}>
            <FileDown className="h-4 w-4 mr-2" />Guardar y descargar PDF
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NewQuote;
