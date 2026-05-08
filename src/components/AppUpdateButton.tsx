import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const clearBrowserAppState = async () => {
  await Promise.allSettled([
    "serviceWorker" in navigator
      ? navigator.serviceWorker.getRegistrations().then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
      : Promise.resolve(),
    "caches" in window
      ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      : Promise.resolve(),
  ]);
};

export function AppUpdateButton() {
  const handleUpdate = async () => {
    toast({ title: "Actualizando app…", description: "Se cargará la última versión disponible." });

    try {
      await clearBrowserAppState();
    } finally {
      const url = new URL(window.location.href);
      url.searchParams.set("app-refresh", Date.now().toString());
      window.location.replace(url.toString());
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleUpdate}
      className="fixed bottom-4 right-4 z-50 shadow-lg"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Actualizar app
    </Button>
  );
}