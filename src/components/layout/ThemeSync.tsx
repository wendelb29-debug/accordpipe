import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Syncs the theme with user profile preference.
 * - Forces "light" when no user is logged in (public pages).
 * - Applies user's saved theme after login.
 */
export function ThemeSync() {
  const { setTheme } = useTheme();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Public pages: always light
      setTheme("light");
      return;
    }

    if (profile) {
      // Apply user's saved theme
      const userTheme = (profile as any).theme || "light";
      setTheme(userTheme);
    }
  }, [user, profile, loading, setTheme]);

  return null;
}
