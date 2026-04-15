/**
 * Accord Edge Function Structured Logger
 * 
 * Usage:
 *   import { EdgeLogger } from "../_shared/edge-logger.ts";
 *   const logger = new EdgeLogger("my-function");
 *   logger.error("Something failed", { tenantId, userId }, error);
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Severity = "info" | "warning" | "error" | "critical";

interface LogContext {
  tenantId?: string | null;
  userId?: string | null;
  [key: string]: unknown;
}

export class EdgeLogger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  info(action: string, context?: LogContext, message?: string) {
    this.log("info", action, context, message);
  }

  warn(action: string, context?: LogContext, message?: string) {
    this.log("warning", action, context, message);
  }

  error(action: string, context?: LogContext, error?: unknown) {
    const err = error instanceof Error ? error : new Error(String(error || "Unknown error"));
    this.log("error", action, context, err.message, err.stack);
  }

  critical(action: string, context?: LogContext, error?: unknown) {
    const err = error instanceof Error ? error : new Error(String(error || "Critical error"));
    this.log("critical", action, context, err.message, err.stack);
  }

  private log(severity: Severity, action: string, context?: LogContext, message?: string, stack?: string) {
    const logMessage = `[${severity.toUpperCase()}] [${this.module}/${action}] ${message || ""}`;
    
    if (severity === "error" || severity === "critical") {
      console.error(logMessage, context || "");
    } else if (severity === "warning") {
      console.warn(logMessage, context || "");
    } else {
      console.log(logMessage, context || "");
    }

    // Persist to DB (fire-and-forget)
    this.persist(severity, action, context, message, stack).catch(() => {});
  }

  private async persist(
    severity: Severity,
    action: string,
    context?: LogContext,
    message?: string,
    stack?: string,
  ) {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // Strip sensitive data from context
      const safeContext = context ? { ...context } : {};
      delete safeContext.token;
      delete safeContext.password;
      delete safeContext.authorization;
      delete safeContext.serviceRoleKey;

      const { tenantId, userId, ...metadata } = safeContext;

      await supabase.rpc("log_system_error", {
        _module: this.module,
        _action: action,
        _message: (message || "No message").substring(0, 2000),
        _severity: severity,
        _tenant_id: tenantId || null,
        _user_id: userId || null,
        _stack_trace: stack?.substring(0, 5000) || null,
        _metadata: metadata,
      });
    } catch {
      // Silently fail
    }
  }
}
