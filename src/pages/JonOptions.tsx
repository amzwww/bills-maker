import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, PlusCircle, Trophy, GraduationCap, FileSignature } from "lucide-react";

const JonOptions = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-6 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Jon Hernández</h1>
            <p className="text-sm text-muted-foreground">Selecciona el tipo de factura</p>
          </div>
        </div>
      </header>
      <main className="container py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5 max-w-6xl">
          <Link to="/nueva?issuer=JHE&type=ponencia">
            <Card className="p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full">
              <Mic className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-bold text-lg mb-1">A) Nueva factura ponencia</h3>
              <p className="text-sm text-muted-foreground">Descripción autogenerada con la fecha de la ponencia.</p>
            </Card>
          </Link>
          <Link to="/nueva?issuer=JHE&type=complemento">
            <Card className="p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full">
              <PlusCircle className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-bold text-lg mb-1">B) Complemento a ponencia</h3>
              <p className="text-sm text-muted-foreground">Cuelga de una factura previa. Línea con sangría para gastos.</p>
            </Card>
          </Link>
          <Link to="/nueva?issuer=JHE&type=sponsor">
            <Card className="p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full">
              <Trophy className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-bold text-lg mb-1">C) Sponsor</h3>
              <p className="text-sm text-muted-foreground">Factura libre por patrocinio.</p>
            </Card>
          </Link>
          <Link to="/nueva?issuer=JHE&type=formacion">
            <Card className="p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full">
              <GraduationCap className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-bold text-lg mb-1">D) Formación</h3>
              <p className="text-sm text-muted-foreground">Factura por servicios de formación.</p>
            </Card>
          </Link>
          <Link to="/presupuestos/nuevo?type=ponencia">
            <Card className="p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full">
              <FileSignature className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-bold text-lg mb-1">E) Presupuesto</h3>
              <p className="text-sm text-muted-foreground">Numeración <code>JHE-PF-AAAA-000</code>. Mismo formato que factura.</p>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default JonOptions;
