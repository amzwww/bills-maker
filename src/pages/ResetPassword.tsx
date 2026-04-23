import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/assets/bills-logo.png";

const ResetPassword = () => {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase pone la sesión de recovery en el hash de la URL
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setReady(true);
    } else {
      // Si llega sin token válido, esperamos al evento PASSWORD_RECOVERY
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setReady(true);
      });
      // fallback: si ya hay sesión, permitimos cambiar igualmente
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true);
      });
      return () => sub.subscription.unsubscribe();
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Mínimo 6 caracteres");
    if (password !== confirm) return toast.error("Las contraseñas no coinciden");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contraseña actualizada");
    nav("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Bills maker" className="h-16 w-16 rounded-2xl" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Bills maker</h1>
            <p className="text-sm text-muted-foreground">Nueva contraseña</p>
          </div>
        </div>
        {!ready ? (
          <p className="text-center text-sm text-muted-foreground">
            Validando enlace…
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Contraseña nueva</Label>
              <div className="relative">
                <Input
                  id="pw"
                  type={showPw ? "text" : "password"}
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
            <div className="space-y-2">
              <Label htmlFor="pw2">Repite la contraseña</Label>
              <Input
                id="pw2"
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Guardando…" : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;
