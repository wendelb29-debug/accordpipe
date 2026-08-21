import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the effective company ID for data queries.
 * For master/CEO users, returns the selected tenant (activeCompanyId).
 * For regular users, returns their profile's company_id.
 */
export function useActiveCompanyId(): string | null {
  const { effectiveCompanyId } = useAuth();
  return effectiveCompanyId;
}
