import { Navigate, useParams } from "react-router-dom";
import NovoServidor from "./NovoServidor";

/**
 * Dedicated tenant edit route: /tenant/:id/editar
 *
 * Wraps NovoServidor by injecting the tenant id via URL search params,
 * so the same form renders in EDIT mode only — never creates a new tenant.
 *
 * Access is gated inside NovoServidor (isGlobalMaster check + ProtectedRoute).
 */
export default function EditarTenant() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <Navigate to="/servidores" replace />;

  // Push id into the query string NovoServidor already understands,
  // then render the same component so we have a single source of truth
  // for the tenant form (no duplicated fields, no drift).
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    if (url.searchParams.get("id") !== id) {
      url.searchParams.set("id", id);
      window.history.replaceState({}, "", url.toString());
    }
  }

  return <NovoServidor />;
}
