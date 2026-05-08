import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator) {
  // Evita que cualquier service worker antiguo sirva una versión obsoleta de la app.
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
}

// --- Auto-actualización para usuarios de navegador (sin PWA/SW) ---
// Captura el fingerprint de los scripts del HTML inicial.
// Cada vez que el usuario vuelve a la pestaña, re-descarga index.html
// y si los scripts cambiaron (= nuevo deploy), recarga la página.
if (import.meta.env.PROD && !isInIframe && !isPreviewHost) {
  const extractScripts = (html: string) => {
    const matches = html.match(/<script[^>]+src="([^"]+)"/g);
    return matches ? matches.join("|") : "";
  };

  let currentFingerprint = "";

  // Capturar fingerprint inicial
  fetch(window.location.origin + "/?_vc=" + Date.now(), {
    cache: "no-store",
    headers: { Accept: "text/html" },
  })
    .then((r) => r.text())
    .then((html) => {
      currentFingerprint = extractScripts(html);
    })
    .catch(() => {});

  // Comprobar en cada vuelta a primer plano
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !currentFingerprint) return;

    fetch(window.location.origin + "/?_vc=" + Date.now(), {
      cache: "no-store",
      headers: { Accept: "text/html" },
    })
      .then((r) => r.text())
      .then((html) => {
        const newFP = extractScripts(html);
        if (newFP && newFP !== currentFingerprint) {
          window.location.reload();
        }
      })
      .catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
