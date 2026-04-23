import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

type Issuer = any;

const IssuerForm = ({ issuer, onSave }: { issuer: Issuer; onSave: (data: Issuer) => void }) => {
  const [data, setData] = useState(issuer);
  useEffect(() => setData(issuer), [issuer]);
  const set = (k: string, v: string) => setData((p: any) => ({ ...p, [k]: v }));

  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-bold text-lg">{data.id} · {data.name}</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div><Label>Nombre / Razón social</Label><Input value={data.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
        <div><Label>CIF/NIF</Label><Input value={data.tax_id || ""} onChange={(e) => set("tax_id", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Dirección</Label><Input value={data.address_line1 || ""} onChange={(e) => set("address_line1", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Dirección 2</Label><Input value={data.address_line2 || ""} onChange={(e) => set("address_line2", e.target.value)} /></div>
        <div><Label>CP y ciudad</Label><Input value={data.city_zip || ""} onChange={(e) => set("city_zip", e.target.value)} /></div>
        <div><Label>Teléfono</Label><Input value={data.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>CCC</Label><Input value={data.ccc || ""} onChange={(e) => set("ccc", e.target.value)} /></div>
        <div><Label>IBAN</Label><Input value={data.iban || ""} onChange={(e) => set("iban", e.target.value)} /></div>
        <div><Label>Swift</Label><Input value={data.swift || ""} onChange={(e) => set("swift", e.target.value)} /></div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => onSave(data)}><Save className="h-4 w-4 mr-2" />Guardar {data.id}</Button>
      </div>
    </Card>
  );
};

const Settings = () => {
  const [issuers, setIssuers] = useState<Issuer[]>([]);

  const load = async () => {
    const { data } = await supabase.from("issuers").select("*").order("id");
    setIssuers(data || []);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data: Issuer) => {
    const { id, created_at, updated_at, ...rest } = data;
    const { error } = await supabase.from("issuers").update(rest).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`${id} actualizado`); load(); }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon"><Link to="/"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-xl font-bold">Datos de los emisores</h1>
        </div>
      </header>
      <main className="container py-6 space-y-6 max-w-3xl">
        {issuers.map((i) => <IssuerForm key={i.id} issuer={i} onSave={handleSave} />)}
      </main>
    </div>
  );
};

export default Settings;
