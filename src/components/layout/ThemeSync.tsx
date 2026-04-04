import { useEffect, useLayoutEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Syncs the theme with user profile preference.
 * - Forces "light" when no user is logged in (public pages).
 * - Applies user's saved theme after login.
 * Uses useLayoutEffect to prevent visible flash.
 */
export function ThemeSync() {
  const { setTheme } = useTheme();
  const { user, profile, loading } = useAuth();

  // Use layout effect for synchronous DOM update before paint
  useLayoutEffect(() => {
    if (loading) return;

    if (!user) {
      setTheme("light");
      return;
    }

    if (profile) {
      const userTheme = profile.theme || "light";
      setTheme(userTheme);
    }
  }, [user, profile, loading, setTheme]);

  return null;
}
