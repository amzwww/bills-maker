import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/assets/bills-logo.png";

const Auth = () => {
  const { signIn, session, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) nav("/", { replace: true });
  }, [session, loading, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) toast.error("Credenciales inválidas");
    else nav("/", { replace: true });
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Te hemos enviado un email para restablecer la contraseña");
      setForgotOpen(false);
      setForgotEmail("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Bills maker" className="h-16 w-16 rounded-2xl" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Bills maker</h1>
            <p className="text-sm text-muted-foreground">
              {forgotOpen ? "Recuperar contraseña" : "Accede a tu cuenta"}
            </p>
          </div>
        </div>

        {!forgotOpen ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotOpen(true);
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        ) : (
          <form onSubmit={sendReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Tu email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Te enviaremos un enlace para crear una contraseña nueva.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={forgotBusy}>
              {forgotBusy ? "Enviando…" : "Enviar enlace"}
            </Button>
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="w-full text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Volver al login
            </button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default Auth;
