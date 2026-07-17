// Small helper for group-* edit functions.
// Each edit function is thin and calls its dedicated uazapi endpoint.
import {
  callUazapi,
  getInstanceRow,
  json,
  requireCaller,
  requireTenantMember,
  serviceClient,
} from "./uazapi.ts";

export interface GroupEditContext {
  tenantId: string;
  groupjid: string;
  token: string;
}

export async function loadGroupContext(
  req: Request,
): Promise<GroupEditContext | Response> {
  const caller = await requireCaller(req);
  if (caller instanceof Response) return caller;
  const body = await req.json().catch(() => ({}));
  const tenantId = String(body?.tenant_id ?? "");
  const groupjid = String(body?.groupjid ?? "").trim();
  if (!tenantId || !groupjid) return json({ error: "tenant_id and groupjid required" }, 400);
  if (!groupjid.endsWith("@g.us")) return json({ error: "groupjid must be <id>@g.us" }, 400);
  const forbid = await requireTenantMember(caller.userId, tenantId);
  if (forbid) return forbid;
  const row = await getInstanceRow(tenantId);
  if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);
  // Pass body back through a Symbol/attached property so handlers can reuse it.
  (globalThis as any).__lastBody = body;
  return { tenantId, groupjid, token: row.uazapi_token };
}

export function lastBody<T = any>(): T {
  return ((globalThis as any).__lastBody ?? {}) as T;
}

export async function patchChat(
  tenantId: string,
  groupjid: string,
  patch: Record<string, unknown>,
) {
  const svc = serviceClient();
  await svc
    .from("whatsapp_chats")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("wa_chatid", groupjid);
}

export { callUazapi, json };
