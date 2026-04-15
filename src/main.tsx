import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initSentry, installGlobalHandlers } from "@/lib/monitoring";

// Initialize monitoring
initSentry();
installGlobalHandlers();

createRoot(document.getElementById("root")!).render(<App />);
