import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ExternalLink, FileText, Search } from "lucide-react";
import { toast } from "sonner";

type LogRow = {
  id: string;
  invoice_id: string | null;
  invoice_number: string;
  source_pdf_name: string | null;
  source_pdf_url: string | null;
  action: string;
  imported_data: any;
  imported_at: string;
};

const ImportLog = () => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("invoice_import_log")
        .select("*")
        .order("imported_at", { ascending: false });
      if (error) toast.error(error.message);
      else setRows((data || []) as LogRow[]);
    })();
  }, []);

  const openPdf = async (path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage
      .from("invoice-sources")
      .createSignedUrl(path, 60 * 5);
    if (error || !data?.signedUrl) return toast.error("No se pudo abrir el PDF");
    window.open(data.signedUrl, "_blank");
  };

  const f = filter.trim().toLowerCase();
  const filtered = f
    ? rows.filter(
        (r) =>
          r.invoice_number.toLowerCase().includes(f) ||
          (r.source_pdf_name || "").toLowerCase().includes(f) ||
          (r.imported_data?.client_name || "").toLowerCase().includes(f)
      )
    : rows;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="container py-3 flex items-center gap-2 flex-wrap">
          <Button asChild variant="ghost" size="icon">
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-base sm:text-xl font-bold flex-1 min-w-0 truncate">
            Historial de importaciones
          </h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/facturas">Ver facturas</Link>
          </Button>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        <Card className="p-4">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar por nº factura, cliente o archivo…"
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {filtered.length} de {rows.length} registros
          </p>
        </Card>

        <Card className="overflow-hidden">
          <div className="table-wrap" style={{ maxHeight: "calc(100vh - 280px)" }}>
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-muted sticky top-0 z-10">
                <tr className="text-left">
                  <th className="p-3 whitespace-nowrap">Fecha</th>
                  <th className="p-3 whitespace-nowrap">Nº factura</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 whitespace-nowrap">Acción</th>
                  <th className="p-3 text-right whitespace-nowrap">Total</th>
                  <th className="p-3">PDF de origen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Sin registros
                    </td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-3 whitespace-nowrap text-xs">
                      {new Date(r.imported_at).toLocaleString("es-ES")}
                    </td>
                    <td className="p-3 font-mono whitespace-nowrap">{r.invoice_number}</td>
                    <td className="p-3">{r.imported_data?.client_name || "—"}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="capitalize">{r.action}</Badge>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap font-semibold">
                      {r.imported_data?.total != null
                        ? `${parseFloat(r.imported_data.total).toFixed(2)} €`
                        : "—"}
                    </td>
                    <td className="p-3">
                      {r.source_pdf_url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPdf(r.source_pdf_url)}
                          title={r.source_pdf_name || ""}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Ver PDF
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sin archivo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ImportLog;
