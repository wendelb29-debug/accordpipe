/**
 * Lê uma variável de ambiente tentando vários nomes (alias) na ordem.
 * Útil porque o painel do Supabase às vezes guarda secrets com nome
 * traduzido (pt-BR) e o código foi escrito em inglês.
 *
 * Uso:
 *   const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID", "ID_CLIENTE_OAUTH_GOOGLE");
 *
 * Se nenhum estiver definido, lança erro com mensagem clara.
 */
export function requireEnv(...names: string[]): string {
  for (const name of names) {
    const v = Deno.env.get(name);
    if (v && v.trim()) return v;
  }
  throw new Error(
    `Variável de ambiente obrigatória não definida. Tentei: ${names.join(", ")}. ` +
    `Verifique em Supabase → Project Settings → Edge Functions → Secrets.`
  );
}

/** Versão sem throw — retorna string vazia se nada for encontrado */
export function readEnv(...names: string[]): string {
  for (const name of names) {
    const v = Deno.env.get(name);
    if (v && v.trim()) return v;
  }
  return "";
}
