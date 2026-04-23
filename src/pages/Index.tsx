import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Settings, List, Users, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/bills-logo.png";

const Index = () => {
  const { isAdmin, signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Bills maker" className="h-10 w-10 rounded-lg" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Bills maker</h1>
              <p className="text-sm text-muted-foreground">Jon Hernández · BrightNexus</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge variant={isAdmin ? "default" : "secondary"}>
              {isAdmin ? "Admin" : "Usuario"}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link to="/facturas"><List className="h-4 w-4 mr-2" />Facturas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/clientes"><Users className="h-4 w-4 mr-2" />Clientes</Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link to="/ajustes"><Settings className="h-4 w-4 mr-2" />Emisores</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} title={user?.email || ""}>
              <LogOut className="h-4 w-4 mr-2" />Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-12">
        {isAdmin ? (
          <>
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
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-2">Bienvenido</h2>
            <p className="text-muted-foreground mb-6">Puedes consultar y exportar facturas y clientes.</p>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
              <Link to="/facturas">
                <Card className="p-8 hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full">
                  <List className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-1">Facturas emitidas</h3>
                  <p className="text-sm text-muted-foreground">Consulta el listado y descarga PDFs.</p>
                </Card>
              </Link>
              <Link to="/clientes">
                <Card className="p-8 hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full">
                  <Users className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-1">Clientes</h3>
                  <p className="text-sm text-muted-foreground">Resumen por cliente y descarga de facturas.</p>
                </Card>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
