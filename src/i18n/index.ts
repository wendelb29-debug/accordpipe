import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ptBR from "./locales/pt-BR.json";
import ptPT from "./locales/pt-PT.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

const savedLang = localStorage.getItem("accord-lang") || "pt-BR";

i18n.use(initReactI18next).init({
  resources: {
    "pt-BR": { translation: ptBR },
    "pt-PT": { translation: ptPT },
    en: { translation: en },
    es: { translation: es },
  },
  lng: savedLang,
  fallbackLng: "pt-BR",
  interpolation: { escapeValue: false },
});

export default i18n;
