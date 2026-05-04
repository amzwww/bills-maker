import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA: registrar service worker solo en producción y fuera de iframes/preview
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isInIframe || isPreviewHost) {
  // Limpieza defensiva en preview: nada de SW aquí
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  }
} else if ("serviceWorker" in navigator && import.meta.env.PROD) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Auto-actualizar cuando hay nueva versión
        if (confirm("Hay una nueva versión disponible. ¿Actualizar ahora?")) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log("App lista para uso offline");
      },
    });

    // Comprobar actualizaciones cada vez que la app vuelve a primer plano
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        updateSW();
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
