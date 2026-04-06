import { useLayoutEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Syncs the next-themes state with the theme already applied by AuthContext.
 * This is lightweight — AuthContext handles the actual DOM class changes.
 */
export function ThemeSync() {
  const { setTheme, resolvedTheme } = useTheme();
  const { user, profile, loading } = useAuth();

  useLayoutEffect(() => {
    if (loading) return;

    let targetTheme: string;

    if (!user) {
      targetTheme = "light";
    } else if (profile?.theme) {
      targetTheme = profile.theme;
    } else {
      targetTheme = "light";
    }

    // Only update next-themes if it differs (avoids re-renders)
    if (resolvedTheme !== targetTheme) {
      setTheme(targetTheme);
    }
  }, [user, profile, loading, setTheme, resolvedTheme]);

  return null;
}
