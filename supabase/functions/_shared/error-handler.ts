/**
 * Accord Edge Functions — Shared error handler.
 *
 * Provê:
 *   - corsHeaders padronizados
 *   - jsonResponse / errorResponse com CORS
 *   - withErrorHandling(handler) — wrapper que captura qualquer throw,
 *     loga via EdgeLogger e devolve resposta JSON consistente.
 *
 * Uso:
 *
 *   import { withErrorHandling, jsonResponse } from "../_shared/error-handler.ts";
 *
 *   Deno.serve(withErrorHandling("my-function", async (req) => {
 *     const body = await req.json();
 *     return jsonResponse({ ok: true, data: body });
 *   }));
 */
import { EdgeLogger } from "./edge-logger.ts";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-auth",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

export interface ErrorBody {
  error: string;
  code?: string;
  details?: unknown;
  requestId?: string;
}

/** Resposta JSON com CORS e content-type corretos. */
export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

/** Resposta de erro padronizada. */
export function errorResponse(
  message: string,
  status = 500,
  extras: { code?: string; details?: unknown; requestId?: string } = {},
) {
  const body: ErrorBody = { error: message, ...extras };
  return jsonResponse(body, status);
}

/** Erro tipado que carrega status HTTP — útil para `throw` em handlers. */
export class HttpError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(message: string, status = 500, opts: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export type EdgeHandler = (req: Request) => Promise<Response> | Response;

/**
 * Envolve um handler Deno.serve adicionando:
 *   - CORS preflight automático
 *   - try/catch global com log estruturado
 *   - Resposta JSON consistente em qualquer falha
 *   - requestId pra rastrear nos logs
 */
export function withErrorHandling(moduleName: string, handler: EdgeHandler): EdgeHandler {
  const logger = new EdgeLogger(moduleName);

  return async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const res = await handler(req);
      // Garante CORS mesmo se o handler montar Response manualmente sem ele
      if (!res.headers.has("Access-Control-Allow-Origin")) {
        const merged = new Headers(res.headers);
        for (const [k, v] of Object.entries(corsHeaders)) merged.set(k, v);
        return new Response(res.body, { status: res.status, headers: merged });
      }
      return res;
    } catch (err) {
      if (err instanceof HttpError) {
        logger.warn("handled_http_error", { requestId, status: err.status, code: err.code }, err.message);
        return errorResponse(err.message, err.status, {
          code: err.code,
          details: err.details,
          requestId,
        });
      }

      logger.error("unhandled_exception", { requestId, url: req.url, method: req.method }, err);
      const message =
        err instanceof Error && err.message ? err.message : "Erro interno do servidor.";
      return errorResponse(message, 500, { requestId });
    }
  };
}
