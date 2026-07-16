// Shared helpers for uazapiGO edge functions.
// - Never expose UAZAPI_ADMIN_TOKEN or an instance token to the client.
// - All calls to uazapiGO happen server-side from Edge Functions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function getBaseUrl(): string {
  const raw = Deno.env.get("UAZAPI_BASE_URL") ?? "";
  return raw.replace(/\/$/, "");
}

export function getAdminToken(): string {
  return Deno.env.get("UAZAPI_ADMIN_TOKEN") ?? "";
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

export async function requireCaller(req: Request): Promise<
  { userId: string } | Response
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const anon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return json({ error: "Unauthorized" }, 401);
  return { userId: data.user.id };
}

/**
 * Ensures the authenticated user is an active member of the tenant,
 * or is a master. Returns Response on failure.
 */
export async function requireTenantMember(
  userId: string,
  tenantId: string
): Promise<Response | null> {
  const svc = serviceClient();
  const { data: ut } = await svc
    .from("user_tenants")
    .select("id, status")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();
  if (ut) return null;
  const { data: role } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "master")
    .maybeSingle();
  if (role) return null;
  const { data: prof } = await svc
    .from("profiles")
    .select("is_master")
    .eq("user_id", userId)
    .maybeSingle();
  if (prof?.is_master === true) return null;
  return json({ error: "Forbidden: not a member of this tenant" }, 403);
}

export async function getInstanceRow(tenantId: string) {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("whatsapp_instances")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return data as
    | {
        id: string;
        tenant_id: string;
        uazapi_instance_id: string | null;
        uazapi_token: string | null;
        instance_name: string | null;
        status: string;
        phone_number: string | null;
        profile_name: string | null;
        profile_pic_url: string | null;
      }
    | null;
}

export interface UazapiChannelSettings {
  allow_active: boolean;
  allow_broadcast: boolean;
  simulate_typing: boolean;
  restrict_agents: boolean;
  allowed_agent_ids: string[];
  display_name: string | null;
  default_flow: string | null;
}

/**
 * Loads the channel configuration toggles from tenant_whatsapp_integrations
 * (provider_metadata.settings) for the uazapi provider.
 */
export async function getUazapiSettings(tenantId: string): Promise<UazapiChannelSettings> {
  const svc = serviceClient();
  const { data } = await svc
    .from("tenant_whatsapp_integrations")
    .select("provider_metadata")
    .eq("tenant_id", tenantId)
    .eq("provider_type", "uazapi")
    .maybeSingle();
  const meta = (data?.provider_metadata ?? {}) as any;
  const s = meta.settings ?? {};
  return {
    allow_active: !!s.allow_active,
    allow_broadcast: !!s.allow_broadcast,
    simulate_typing: !!s.simulate_typing,
    restrict_agents: !!s.restrict_agents,
    allowed_agent_ids: Array.isArray(s.allowed_agent_ids) ? s.allowed_agent_ids : [],
    display_name: meta.display_name ?? null,
    default_flow: meta.default_flow ?? null,
  };
}

/**
 * Enforces the "Restringir atendentes" toggle. When enabled, only users listed
 * in allowed_agent_ids (or masters/tenant admins/ceos) can send messages.
 */
export async function enforceAgentRestriction(
  userId: string,
  tenantId: string,
  settings: UazapiChannelSettings
): Promise<Response | null> {
  if (!settings.restrict_agents) return null;
  if (settings.allowed_agent_ids.includes(userId)) return null;
  const svc = serviceClient();
  const { data: roles } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (roleSet.has("master")) return null;
  const { data: ut } = await svc
    .from("user_tenants")
    .select("role")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();
  const tenantRole = (ut as any)?.role;
  if (tenantRole === "admin" || tenantRole === "ceo") return null;
  return json({ error: "forbidden_agent_not_allowed_on_channel" }, 403);
}

export interface UazapiCallOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string; // instance token
  useAdminToken?: boolean;
  headers?: Record<string, string>;
}

export async function callUazapi(path: string, opts: UazapiCallOptions = {}) {
  const base = getBaseUrl();
  if (!base) throw new Error("UAZAPI_BASE_URL not configured");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers ?? {}),
  };
  if (opts.useAdminToken) {
    const admin = getAdminToken();
    if (!admin) throw new Error("UAZAPI_ADMIN_TOKEN not configured");
    headers["admintoken"] = admin;
  } else if (opts.token) {
    headers["token"] = opts.token;
  }
  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(
      `uazapi ${path} failed: ${res.status} ${JSON.stringify(data)}`
    );
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  return data;
}

export function slugifyTenant(id: string, name?: string | null): string {
  const base = (name || "accord-tenant").toString().toLowerCase();
  const clean = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `${clean || "accord"}-${id.slice(0, 8)}`;
}

/** Normalize a phone into a plain digits string, e.g. 5511999999999 */
export function normalizePhone(phone: string): string {
  return String(phone || "").replace(/\D+/g, "");
}

// ===== Onda 6: helpers de persistência total =====

const MEDIA_TYPES = new Set([
  "image","video","videoplay","audio","myaudio","ptt","ptv","document","sticker",
]);

export function isMediaType(t: string | null | undefined): boolean {
  return !!t && MEDIA_TYPES.has(String(t).toLowerCase());
}

function extFromMime(mime?: string | null, fallback = "bin"): string {
  if (!mime) return fallback;
  const m = mime.toLowerCase();
  if (m.includes("jpeg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("quicktime")) return "mov";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mpeg") && m.includes("audio")) return "mp3";
  if (m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("pdf")) return "pdf";
  if (m.includes("msword")) return "doc";
  if (m.includes("officedocument")) return "docx";
  return fallback;
}

/**
 * Baixa a mídia da uazapi e faz upload para o bucket whatsapp-media do Accord.
 * Retorna { storagePath, publicPath, mimetype, transcription } ou lança.
 */
export async function fetchAndStoreUazapiMedia(params: {
  tenantId: string;
  externalMessageId: string;
  instanceToken: string;
  isAudio: boolean;
}): Promise<{
  storagePath: string;
  mimetype: string | null;
  transcription: string | null;
}> {
  const { tenantId, externalMessageId, instanceToken, isAudio } = params;
  const meta: any = await callUazapi("/message/download", {
    method: "POST",
    token: instanceToken,
    body: {
      id: externalMessageId,
      return_link: true,
      generate_mp3: true,
      transcribe: isAudio,
    },
  });

  const fileUrl: string | null = meta?.fileURL ?? meta?.fileUrl ?? meta?.url ?? null;
  const base64: string | null = meta?.base64Data ?? meta?.base64 ?? null;
  const mimetype: string | null =
    meta?.mimetype ?? meta?.mimeType ?? meta?.contentType ?? null;
  const transcription: string | null =
    meta?.transcription ?? meta?.transcript ?? null;

  let bytes: Uint8Array | null = null;
  if (fileUrl) {
    const r = await fetch(fileUrl);
    if (r.ok) bytes = new Uint8Array(await r.arrayBuffer());
  }
  if (!bytes && base64) {
    try {
      const clean = base64.replace(/^data:[^;]+;base64,/, "");
      const bin = atob(clean);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      bytes = arr;
    } catch { /* ignore */ }
  }
  if (!bytes) throw new Error("uazapi media: no bytes to store");

  const ext = extFromMime(mimetype);
  const safeId = externalMessageId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 128);
  const storagePath = `${tenantId}/${safeId}.${ext}`;

  const svc = serviceClient();
  const { error: upErr } = await svc.storage
    .from("whatsapp-media")
    .upload(storagePath, bytes, {
      contentType: mimetype ?? "application/octet-stream",
      upsert: true,
    });
  if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);

  return { storagePath, mimetype, transcription };
}

/** Retorna URL assinada (7 dias) para reprodução no inbox. */
export async function signedMediaUrl(path: string, expiresInSec = 60 * 60 * 24 * 7): Promise<string | null> {
  const svc = serviceClient();
  const { data, error } = await svc.storage.from("whatsapp-media").createSignedUrl(path, expiresInSec);
  if (error) return null;
  return data?.signedUrl ?? null;
}

