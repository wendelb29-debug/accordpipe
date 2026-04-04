import { useLayoutEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Syncs the theme with user profile preference.
 * - Forces "light" when no user is logged in (public pages).
 * - Applies user's saved theme after login.
 * - Adds a transitioning class for smooth CSS transitions.
 */
export function ThemeSync() {
  const { setTheme, theme } = useTheme();
  const { user, profile, loading } = useAuth();

  useLayoutEffect(() => {
    if (loading) return;

    let targetTheme: string;

    if (!user) {
      targetTheme = "light";
    } else if (profile) {
      targetTheme = profile.theme || "light";
    } else {
      return;
    }

    if (theme !== targetTheme) {
      document.documentElement.classList.add("transitioning");
      setTheme(targetTheme);
      const timer = setTimeout(() => {
        document.documentElement.classList.remove("transitioning");
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [user, profile, loading, setTheme, theme]);

  return null;
}
