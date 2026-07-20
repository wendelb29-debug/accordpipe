import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * <UserAvatar> — Componente único e reutilizável para exibir a foto de perfil
 * de qualquer usuário INTERNO do Accord (atendente / admin / operador).
 *
 * Regras:
 *  - Se `avatarUrl` for fornecido, exibe a foto (object-fit: cover, circular).
 *  - Se não houver avatarUrl mas houver `userId`, faz lazy-fetch em `profiles`
 *    (RLS garante isolamento multi-tenant).
 *  - Fallback: iniciais (1ª letra do nome + 1ª do sobrenome) sobre gradiente
 *    determinístico da mesma paleta usada em Auditoria/Performance.
 *
 * NÃO usar para contatos externos do WhatsApp — esses têm seu próprio avatar
 * vindo da uazapi.
 */

const USER_PALETTE = [
  "from-violet-500 to-violet-700",
  "from-emerald-500 to-emerald-700",
  "from-blue-500 to-blue-700",
  "from-pink-500 to-pink-700",
  "from-amber-500 to-amber-700",
  "from-cyan-500 to-cyan-700",
  "from-fuchsia-500 to-fuchsia-700",
  "from-indigo-500 to-indigo-700",
];

export function userAvatarGradient(seed?: string | null) {
  if (!seed) return USER_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return USER_PALETTE[hash % USER_PALETTE.length];
}

export function userAvatarInitials(name?: string | null) {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Cache leve por sessão para evitar re-fetch do mesmo user_id em várias linhas.
const profileCache = new Map<string, { avatar_url: string | null; name: string | null }>();
const inflight = new Map<string, Promise<{ avatar_url: string | null; name: string | null } | null>>();

async function fetchProfileMini(userId: string) {
  if (profileCache.has(userId)) return profileCache.get(userId)!;
  if (inflight.has(userId)) return inflight.get(userId)!;
  const p = (async () => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, name")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      const rec = { avatar_url: (data as any).avatar_url ?? null, name: (data as any).name ?? null };
      profileCache.set(userId, rec);
      return rec;
    }
    return null;
  })();
  inflight.set(userId, p);
  try { return await p; } finally { inflight.delete(userId); }
}

export interface UserAvatarProps {
  userId?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  /** Diâmetro em px. Default 32. */
  size?: number;
  className?: string;
  title?: string;
}

export function UserAvatar({
  userId,
  name,
  avatarUrl,
  size = 32,
  className,
  title,
}: UserAvatarProps) {
  const [resolved, setResolved] = useState<{ avatar_url: string | null; name: string | null } | null>(
    avatarUrl !== undefined || name !== undefined
      ? { avatar_url: avatarUrl ?? null, name: name ?? null }
      : null,
  );

  useEffect(() => {
    // Só faz fetch se não tivermos avatarUrl nem name explícito e tivermos userId.
    if (avatarUrl || name) {
      setResolved({ avatar_url: avatarUrl ?? null, name: name ?? null });
      return;
    }
    if (!userId) return;
    let cancelled = false;
    fetchProfileMini(userId).then((rec) => {
      if (!cancelled && rec) setResolved(rec);
    });
    return () => { cancelled = true; };
  }, [userId, avatarUrl, name]);

  const displayName = resolved?.name ?? name ?? null;
  const url = resolved?.avatar_url ?? avatarUrl ?? null;
  const gradient = userAvatarGradient(userId || displayName || "?");
  const fontSize = Math.max(10, Math.round(size * 0.38));

  return (
    <Avatar
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
      title={title || displayName || undefined}
    >
      {url ? <AvatarImage src={url} alt={displayName || ""} className="object-cover" /> : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br text-white font-semibold",
          gradient,
        )}
        style={{ fontSize }}
      >
        {userAvatarInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}

export default UserAvatar;
