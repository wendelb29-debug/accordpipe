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
