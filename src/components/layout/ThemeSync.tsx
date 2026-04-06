import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Syncs the user's theme preference from their profile to the DOM.
 * Manipulates DOM directly to avoid re-renders. No next-themes dependency.
 */
export function ThemeSync() {
  const { user, profile, loading } = useAuth();

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

  return null;
}
