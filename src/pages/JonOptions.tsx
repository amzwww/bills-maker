import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, PlusCircle, Trophy } from "lucide-react";

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
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl">
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
        </div>
      </main>
    </div>
  );
};

export default JonOptions;
