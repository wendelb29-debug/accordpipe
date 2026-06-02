/**
 * Accord Frontend Error Handler
 *
 * Wrappers padronizados para chamadas Supabase e operações assíncronas.
 * - Toast discreto (sonner) para erros recuperáveis
 * - Log estruturado via captureAppError → DB + Sentry
 * - Mensagens em pt-BR e amigáveis, sem vazar stack do Postgres
 *
 * Uso típico:
 *   const data = await tryAsync(
 *     () => supabase.from("leads").select("*").throwOnError(),
 *     { module: "leads", action: "list", userMessage: "Erro ao carregar leads" }
 *   );
 *   if (!data) return; // já avisou o usuário
 */
import { toast } from "sonner";
import { captureAppError } from "@/lib/monitoring";
import type { PostgrestError } from "@supabase/supabase-js";

type Severity = "info" | "warning" | "error" | "critical";

export interface TryAsyncOptions {
  module: string;
  action: string;
  userMessage?: string;            // mensagem amigável p/ toast
  silent?: boolean;                // não exibe toast (apenas loga)
  severity?: Severity;             // default: "error"
  tenantId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  onError?: (err: unknown) => void;
}

const PG_FRIENDLY_MESSAGES: Record<string, string> = {
  "23505": "Este registro já existe.",
  "23503": "Existe uma referência impedindo esta operação.",
  "23502": "Campo obrigatório não preenchido.",
  "42501": "Você não tem permissão para esta ação.",
  "PGRST116": "Registro não encontrado.",
  "PGRST301": "Sessão expirada. Faça login novamente.",
};

/** Converte erros do Supabase/Postgres em mensagens amigáveis em pt-BR. */
export function friendlyErrorMessage(err: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (!err) return fallback;

  // PostgrestError
  if (typeof err === "object" && err !== null) {
    const e = err as Partial<PostgrestError> & { message?: string; status?: number; statusCode?: number };
    if (e.code && PG_FRIENDLY_MESSAGES[e.code]) return PG_FRIENDLY_MESSAGES[e.code];

    const status = e.status ?? e.statusCode;
    if (status === 401) return "Sessão expirada. Faça login novamente.";
    if (status === 403) return "Você não tem permissão para esta ação.";
    if (status === 404) return "Recurso não encontrado.";
    if (status === 429) return "Muitas requisições. Aguarde alguns segundos.";
    if (status && status >= 500) return "O servidor está indisponível no momento. Tente novamente.";

    if (e.message) {
      const msg = String(e.message);
      if (/network|fetch|failed to fetch/i.test(msg)) {
        return "Sem conexão. Verifique sua internet.";
      }
      if (/timeout/i.test(msg)) return "A operação demorou muito. Tente novamente.";
      // Não devolve mensagem crua do Postgres (pode vazar schema)
      if (msg.length < 120 && !/postgres|pg_|relation|column/i.test(msg)) return msg;
    }
  }

  if (typeof err === "string" && err.length < 120) return err;
  return fallback;
}

/**
 * Executa uma função assíncrona com tratamento de erro padronizado.
 * Retorna o resultado em caso de sucesso, ou `null` em caso de erro
 * (e o usuário já foi notificado via toast — salvo `silent: true`).
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  opts: TryAsyncOptions
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    handleError(err, opts);
    return null;
  }
}

/** Trata erro: loga estruturadamente e (opcionalmente) exibe toast. */
export function handleError(err: unknown, opts: TryAsyncOptions): void {
  const severity = opts.severity ?? "error";

  captureAppError(
    err,
    {
      module: opts.module,
      action: opts.action,
      tenantId: opts.tenantId,
      userId: opts.userId,
      metadata: opts.metadata,
    },
    severity
  );

  if (!opts.silent) {
    const message = opts.userMessage || friendlyErrorMessage(err);
    if (severity === "critical" || severity === "error") {
      toast.error(message);
    } else if (severity === "warning") {
      toast.warning(message);
    } else {
      toast.info(message);
    }
  }

  opts.onError?.(err);
}

/**
 * Wrapper específico para chamadas Supabase no padrão `{ data, error }`.
 *
 *   const rows = await safeSupabase(
 *     supabase.from("leads").select("*"),
 *     { module: "leads", action: "list" }
 *   );
 */
export async function safeSupabase<T>(
  query: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  opts: TryAsyncOptions
): Promise<T | null> {
  try {
    const { data, error } = await query;
    if (error) {
      handleError(error, opts);
      return null;
    }
    return data;
  } catch (err) {
    handleError(err, opts);
    return null;
  }
}
