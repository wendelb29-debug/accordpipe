/**
 * Route-scoped error boundary.
 *
 * Wraps each route element so a crash in one page doesn't tear down the
 * whole app shell (header, sidebar, auth context) — the user can still
 * navigate elsewhere. The app-root ErrorBoundary in App.tsx remains as
 * the final safety net for catastrophic failures.
 */
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReactNode } from "react";

interface Props {
  routeName: string;
  children: ReactNode;
}

export function RouteErrorBoundary({ routeName, children }: Props) {
  return <ErrorBoundary fallbackModule={`route:${routeName}`}>{children}</ErrorBoundary>;
}
