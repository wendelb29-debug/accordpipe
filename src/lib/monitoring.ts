/**
 * Accord Monitoring — Frontend error capture & structured logging
 * 
 * Sentry integration is opt-in: set VITE_SENTRY_DSN to activate.
 * Without Sentry, errors are logged to console + system_error_logs table.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────
type Severity = "info" | "warning" | "error" | "critical";

interface ErrorContext {
  module: string;
  action: string;
  tenantId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

// ─── Sentry lazy loader ──────────────────────────────────────────
let _sentry: typeof import("@sentry/react") | null = null;
let _sentryInitialized = false;

export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || _sentryInitialized) return;

  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE || "production",
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0.5,
      beforeSend(event) {
        // Strip sensitive fields
        if (event.request?.headers) {
          delete event.request.headers["authorization"];
        }
        return event;
      },
    });
    _sentry = Sentry;
    _sentryInitialized = true;
    console.info("[Accord Monitoring] Sentry initialized");
  } catch (err) {
    console.warn("[Accord Monitoring] Failed to load Sentry, using fallback logging", err);
  }
}

// ─── Context management ──────────────────────────────────────────
let _globalContext: Partial<ErrorContext> = {};

export function setMonitoringUser(userId: string, email?: string, tenantId?: string | null) {
  _globalContext = { ..._globalContext, userId, tenantId };
  if (_sentry) {
    _sentry.setUser({ id: userId, email });
    if (tenantId) _sentry.setTag("tenant_id", tenantId);
  }
}

export function clearMonitoringUser() {
  _globalContext = {};
  if (_sentry) {
    _sentry.setUser(null);
  }
}

// ─── Core capture functions ──────────────────────────────────────

/** Capture an error with full context */
export function captureAppError(
  error: unknown,
  context: ErrorContext,
  severity: Severity = "error"
) {
  const err = error instanceof Error ? error : new Error(String(error));
  const merged = { ..._globalContext, ...context };

  // Console
  console.error(`[Accord ${severity.toUpperCase()}] [${merged.module}/${merged.action}]`, err.message);

  // Sentry
  if (_sentry) {
    _sentry.withScope((scope) => {
      scope.setLevel(severity === "critical" ? "fatal" : severity);
      scope.setTag("module", merged.module);
      scope.setTag("action", merged.action);
      if (merged.tenantId) scope.setTag("tenant_id", merged.tenantId);
      if (merged.metadata) scope.setContext("metadata", merged.metadata as Record<string, unknown>);
      _sentry!.captureException(err);
    });
  }

  // Persist to DB (fire-and-forget)
  persistErrorLog(severity, err, merged).catch(() => {});
}

/** Log a warning without throwing */
export function captureAppWarning(message: string, context: ErrorContext) {
  console.warn(`[Accord WARNING] [${context.module}/${context.action}]`, message);
  
  if (_sentry) {
    _sentry.captureMessage(message, "warning");
  }

  persistErrorLog("warning", new Error(message), { ..._globalContext, ...context }).catch(() => {});
}

/** Log an info event */
export function captureAppInfo(message: string, context: ErrorContext) {
  persistErrorLog("info", new Error(message), { ..._globalContext, ...context }).catch(() => {});
}

// ─── DB persistence ──────────────────────────────────────────────

async function persistErrorLog(
  severity: Severity,
  error: Error,
  context: Partial<ErrorContext>
) {
  try {
    const safeMetadata = context.metadata ? JSON.parse(JSON.stringify(context.metadata)) : {};
    // Remove any sensitive keys
    delete safeMetadata.token;
    delete safeMetadata.password;
    delete safeMetadata.authorization;

    await supabase.from("system_error_logs").insert({
      tenant_id: context.tenantId || null,
      user_id: context.userId || null,
      module: context.module || "unknown",
      action: context.action || "unknown",
      severity,
      message: error.message?.substring(0, 2000) || "Unknown error",
      stack_trace: error.stack?.substring(0, 5000) || null,
      metadata: safeMetadata,
    } as any);
  } catch {
    // Silently fail — don't create error loops
  }
}

// ─── Global handlers ─────────────────────────────────────────────

export function installGlobalHandlers() {
  window.addEventListener("unhandledrejection", (event) => {
    captureAppError(event.reason, {
      module: "global",
      action: "unhandled_promise_rejection",
    }, "error");
  });

  window.addEventListener("error", (event) => {
    captureAppError(event.error || event.message, {
      module: "global",
      action: "uncaught_error",
      metadata: { filename: event.filename, lineno: event.lineno },
    }, "error");
  });
}
