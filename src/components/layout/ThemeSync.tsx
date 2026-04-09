import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Converts a HEX color (#RRGGBB) to HSL string "H S% L%" for CSS variables.
 */
export function hexToHsl(hex: string): string | null {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function darkenHsl(hsl: string, amount: number): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return hsl;
  const h = parseInt(parts[1]);
  const s = parseInt(parts[2]);
  const l = Math.max(0, parseInt(parts[3]) - amount);
  return `${h} ${s}% ${l}%`;
}

export function lightenHsl(hsl: string, amount: number): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return hsl;
  const h = parseInt(parts[1]);
  const s = parseInt(parts[2]);
  const l = Math.min(100, parseInt(parts[3]) + amount);
  return `${h} ${s}% ${l}%`;
}

// Default ACCORD brand HSL values (from index.css)
const DEFAULTS = {
  primary: "224 76% 53%",
  primaryGlow: "263 87% 60%",
  sidebarBg: "224 62% 15%",
  sidebarForeground: "220 20% 93%",
  sidebarPrimary: "263 87% 60%",
  sidebarAccent: "224 50% 20%",
  sidebarBorder: "224 45% 18%",
  ring: "224 76% 53%",
  accent: "220 14% 93%",
  accentForeground: "224 71% 7%",
};

export function ThemeSync() {
  const { user, profile, loading, activeCompanyId, isMaster } = useAuth();

  // Theme sync (dark/light)
  useEffect(() => {
    if (loading) return;
    let targetTheme: string;
    if (!user) {
      targetTheme = "light";
    } else if (profile?.theme) {
      targetTheme = profile.theme;
    } else {
      targetTheme = "light";
    }
    const html = document.documentElement;
    const current = html.classList.contains("dark") ? "dark" : "light";
    if (current !== targetTheme) {
      html.classList.remove("light", "dark");
      html.classList.add(targetTheme);
      localStorage.setItem("theme", targetTheme);
    }
  }, [user, profile, loading]);

  // Tenant brand colors sync — master tenant always uses ACCORD defaults
  useEffect(() => {
    if (!activeCompanyId || !user) {
      applyBrandColors(null);
      return;
    }

    const fetchBrand = async () => {
      const { data } = await supabase
        .from("companies")
        .select("brand_primary_color, brand_secondary_color, brand_accent_color, brand_bg_color, brand_text_color, servidor_id")
        .eq("id", activeCompanyId)
        .single();

      // Master tenant (servidor_id IS NULL) always uses original Accord colors
      if (!data || data.servidor_id === null) {
        applyBrandColors(null);
      } else {
        applyBrandColors(data);
      }
    };

    fetchBrand();

    const handleBrandUpdate = () => fetchBrand();
    window.addEventListener("brand-colors-updated", handleBrandUpdate);
    return () => window.removeEventListener("brand-colors-updated", handleBrandUpdate);
  }, [activeCompanyId, user]);

  return null;
}

export function applyBrandColors(brand: {
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_accent_color: string | null;
  brand_bg_color: string | null;
  brand_text_color: string | null;
} | null) {
  const root = document.documentElement;

  if (!brand || !brand.brand_primary_color) {
    // Reset to ACCORD defaults
    root.style.setProperty("--primary", DEFAULTS.primary);
    root.style.setProperty("--primary-glow", DEFAULTS.primaryGlow);
    root.style.setProperty("--ring", DEFAULTS.ring);
    root.style.setProperty("--sidebar-background", DEFAULTS.sidebarBg);
    root.style.setProperty("--sidebar-foreground", DEFAULTS.sidebarForeground);
    root.style.setProperty("--sidebar-primary", DEFAULTS.sidebarPrimary);
    root.style.setProperty("--sidebar-accent", DEFAULTS.sidebarAccent);
    root.style.setProperty("--sidebar-border", DEFAULTS.sidebarBorder);
    root.style.setProperty("--sidebar-ring", DEFAULTS.sidebarPrimary);
    root.style.setProperty("--gradient-accord-btn", "linear-gradient(135deg, #2563EB, #7A3FF2)");
    root.style.setProperty("--gradient-primary", "linear-gradient(135deg, #0F1C3F 0%, #3B3F9C 35%, #7A3FF2 70%, #D94FD5 100%)");
    // Reset accent/foreground overrides
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-foreground");
    return;
  }

  const primaryHsl = hexToHsl(brand.brand_primary_color);
  const accentHsl = brand.brand_accent_color ? hexToHsl(brand.brand_accent_color) : null;
  const secondaryHsl = brand.brand_secondary_color ? hexToHsl(brand.brand_secondary_color) : null;

  if (primaryHsl) {
    root.style.setProperty("--primary", primaryHsl);
    root.style.setProperty("--ring", primaryHsl);

    // Sidebar derives from primary — deep dark version
    const sidebarBg = darkenHsl(primaryHsl, 38);
    const sidebarAccent = darkenHsl(primaryHsl, 30);
    const sidebarBorder = darkenHsl(primaryHsl, 33);

    root.style.setProperty("--sidebar-background", sidebarBg);
    root.style.setProperty("--sidebar-accent", sidebarAccent);
    root.style.setProperty("--sidebar-border", sidebarBorder);
    root.style.setProperty("--sidebar-foreground", DEFAULTS.sidebarForeground);

    // Dynamic button gradients from brand colors
    const glowHsl = accentHsl || secondaryHsl || lightenHsl(primaryHsl, 15);
    const primaryCss = `hsl(${primaryHsl})`;
    const glowCss = `hsl(${glowHsl})`;
    const darkPrimaryCss = `hsl(${darkenHsl(primaryHsl, 20)})`;

    root.style.setProperty("--gradient-accord-btn", `linear-gradient(135deg, ${primaryCss}, ${glowCss})`);
    root.style.setProperty("--gradient-primary", `linear-gradient(135deg, ${darkPrimaryCss} 0%, ${primaryCss} 45%, ${glowCss} 100%)`);
  }

  // Apply accent color to global accent token
  if (accentHsl) {
    root.style.setProperty("--primary-glow", accentHsl);
    root.style.setProperty("--sidebar-primary", accentHsl);
    root.style.setProperty("--sidebar-ring", accentHsl);
    root.style.setProperty("--accent", lightenHsl(accentHsl, 30));
    root.style.setProperty("--accent-foreground", darkenHsl(accentHsl, 30));
  } else if (secondaryHsl) {
    root.style.setProperty("--primary-glow", secondaryHsl);
    root.style.setProperty("--sidebar-primary", secondaryHsl);
    root.style.setProperty("--sidebar-ring", secondaryHsl);
  }
}
