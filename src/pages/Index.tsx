import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Settings, List, Users } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Facturador</h1>
            <p className="text-sm text-muted-foreground">Jon Hernández · BrightNexus</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/facturas"><List className="h-4 w-4 mr-2" />Facturas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/clientes"><Users className="h-4 w-4 mr-2" />Clientes</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/ajustes"><Settings className="h-4 w-4 mr-2" />Emisores</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-12">
        <h2 className="text-xl font-semibold mb-6">¿A nombre de quién facturamos?</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
          <Link to="/jon">
            <Card className="p-8 hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full">
              <FileText className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-1">Jon Hernández</h3>
              <p className="text-sm text-muted-foreground mb-3">Numeración: <code className="text-foreground">JHE-AAAA-000</code></p>
              <p className="text-sm">Ponencia · Complemento · Sponsor</p>
            </Card>
          </Link>
          <Link to="/nueva?issuer=BN&type=sponsor">
            <Card className="p-8 hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full">
              <FileText className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-1">BrightNexus</h3>
              <p className="text-sm text-muted-foreground mb-3">Numeración: <code className="text-foreground">BN-AAAA-000</code></p>
              <p className="text-sm">Factura genérica</p>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Index;
