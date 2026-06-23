import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initSentry, installGlobalHandlers } from "@/lib/monitoring";

// Initialize monitoring
initSentry();
installGlobalHandlers();

// Register notification service worker (skipped in Lovable preview/dev).
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  const host = window.location.hostname;
  const isPreview =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev") ||
    new URLSearchParams(window.location.search).get("sw") === "off";

  if (isPreview) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        if (r.active?.scriptURL.endsWith("/service-worker.js")) r.unregister();
      });
    }).catch(() => {});
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch((err) => console.error("[App] SW error:", err));
    });

    // Handle clicks routed from the SW
    navigator.serviceWorker.addEventListener("message", (event) => {
      const data = (event as MessageEvent).data;
      if (data?.type === "notification-click" && data.url) {
        try { window.history.pushState({}, "", data.url); } catch { /* noop */ }
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
