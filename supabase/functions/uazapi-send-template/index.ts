import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  callUazapi,
  corsHeaders,
  enforceAgentRestriction,
  getInstanceRow,
  getUazapiSettings,
  json,
  normalizePhone,
  requireCaller,
  requireTenantMember,
  serviceClient,
} from "../_shared/uazapi.ts";

interface TemplateButton {
  label: string;
  type: "reply" | "url" | "call" | "copy";
  value: string;
}

interface TemplateRow {
  id: string;
  tenant_id: string;
  name: string;
  header_type: "none" | "text" | "image" | "video" | "document" | "audio";
  header_text: string | null;
  header_media_url: string | null;
  header_media_doc_name: string | null;
  body: string;
  footer: string | null;
  buttons: TemplateButton[] | null;
  variable_count: number;
}

function substituteVars(text: string | null | undefined, vars: Record<string, string>): string {
  if (!text) return "";
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => (vars[String(n)] ?? "").toString());
}

function collectRequiredVars(t: TemplateRow): string[] {
  const nums = new Set<number>();
  for (const src of [t.body, t.header_text, t.footer]) {
    if (!src) continue;
    const matches = src.matchAll(/\{\{(\d+)\}\}/g);
    for (const m of matches) nums.add(parseInt(m[1], 10));
  }
  return Array.from(nums).sort((a, b) => a - b).map(String);
}

function buttonToChoice(b: TemplateButton): string {
  const label = String(b.label || "").trim();
  const value = String(b.value || "").trim();
  switch (b.type) {
    case "url":  return `${label}|url:${value}`;
    case "call": return `${label}|call:${value}`;
    case "copy": return `${label}|copy:${value}`;
    case "reply":
    default:     return `${label}|${label}`;
  }
}

async function signedMediaUrl(path: string): Promise<string> {
  // If it's already a full URL, return as is
  if (/^https?:\/\//i.test(path)) return path;
  const svc = serviceClient();
  const { data, error } = await svc.storage
    .from("whatsapp-template-media")
    .createSignedUrl(path, 60 * 60 * 24); // 24h
  if (error || !data?.signedUrl) throw new Error(`Failed to sign media url: ${error?.message}`);
  return data.signedUrl;
}

function mediaTypeForSend(headerType: string): string {
  switch (headerType) {
    case "image": return "image";
    case "video": return "video";
    case "audio": return "audio";
    case "document": return "document";
    default: return "image";
  }
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireCaller(req);
    if (caller instanceof Response) return caller;

    const { tenant_id, template_id, number, variable_values, lead_id } = await req.json();
    if (!tenant_id || !template_id || !number) {
      return json({ error: "tenant_id, template_id and number are required" }, 400);
    }

    const forbid = await requireTenantMember(caller.userId, tenant_id);
    if (forbid) return forbid;

    const svc = serviceClient();
    const { data: tpl, error: tplErr } = await svc
      .from("whatsapp_templates")
      .select("*")
      .eq("id", template_id)
      .eq("tenant_id", tenant_id)
      .maybeSingle();
    if (tplErr || !tpl) return json({ error: "template_not_found" }, 404);
    const template = tpl as TemplateRow;

    // Validate required variables
    const required = collectRequiredVars(template);
    const vars: Record<string, string> = variable_values || {};
    const missing = required.filter((k) => {
      const v = vars[k];
      return v === undefined || v === null || String(v).trim() === "";
    });
    if (missing.length > 0) {
      return json({
        error: "missing_variables",
        message: `Variáveis obrigatórias faltando: ${missing.map(m => `{{${m}}}`).join(", ")}`,
        missing,
      }, 400);
    }

    const settings = await getUazapiSettings(tenant_id);
    if (!settings.allow_active && !lead_id) {
      return json({ error: "active_messages_disabled", message: "Envio ativo desabilitado para este canal." }, 403);
    }
    const agentBlock = await enforceAgentRestriction(caller.userId, tenant_id, settings);
    if (agentBlock) return agentBlock;

    const row = await getInstanceRow(tenant_id);
    if (!row?.uazapi_token) return json({ error: "instance_not_connected" }, 400);

    const phone = normalizePhone(number);
    const bodyText = substituteVars(template.body, vars);
    const headerText = substituteVars(template.header_text, vars);
    const footerText = substituteVars(template.footer, vars);
    const buttons: TemplateButton[] = Array.isArray(template.buttons) ? template.buttons : [];
    const hasButtons = buttons.length > 0;
    const headerType = template.header_type || "none";
    const isMediaHeader = ["image", "video", "document", "audio"].includes(headerType);

    // --- Case A: no buttons ---
    if (!hasButtons) {
      if (!isMediaHeader) {
        const text = [headerText, bodyText, footerText].filter(Boolean).join("\n\n");
        const data = await callUazapi("/send/text", {
          method: "POST",
          token: row.uazapi_token,
          body: {
            number: phone,
            text,
            readchat: true,
            track_source: "accord_template",
            track_id: template.id,
            ...(settings.simulate_typing ? { delay: 3 } : {}),
          },
        });
        return json({ ok: true, message: data, mode: "text" });
      }

      const fileUrl = template.header_media_url ? await signedMediaUrl(template.header_media_url) : null;
      if (!fileUrl) return json({ error: "template_media_missing" }, 400);
      const caption = [bodyText, footerText].filter(Boolean).join("\n\n");
      const data = await callUazapi("/send/media", {
        method: "POST",
        token: row.uazapi_token,
        body: {
          number: phone,
          type: mediaTypeForSend(headerType),
          file: fileUrl,
          text: caption || undefined,
          docName: headerType === "document" ? template.header_media_doc_name || undefined : undefined,
          readchat: true,
          track_source: "accord_template",
          track_id: template.id,
          ...(settings.simulate_typing ? { delay: 3 } : {}),
        },
      });
      return json({ ok: true, message: data, mode: "media" });
    }

    // --- Case B: has buttons ---
    const choices = buttons.map(buttonToChoice);
    const menuType = choices.length > 3 ? "list" : "button";
    const listChoices = choices.map((c) => {
      // for list, format is "text|id|description"
      // when converting from button "label|value" reuse as text|id
      const parts = c.split("|");
      return `${parts[0]}|${parts[1] ?? parts[0]}|`;
    });

    // Sub-case B1: image header — single /send/menu with imageButton
    if (headerType === "image") {
      const imgUrl = template.header_media_url ? await signedMediaUrl(template.header_media_url) : null;
      const menuBody: Record<string, unknown> = {
        number: phone,
        type: menuType,
        text: bodyText,
        footerText: footerText || undefined,
        choices: menuType === "list" ? listChoices : choices,
        readchat: true,
        track_source: "accord_template",
        track_id: template.id,
      };
      if (imgUrl) menuBody.imageButton = imgUrl;
      if (menuType === "list") menuBody.listButton = "Ver opções";
      if (settings.simulate_typing) menuBody.delay = 3;

      const data = await callUazapi("/send/menu", {
        method: "POST",
        token: row.uazapi_token,
        body: menuBody,
      });
      return json({ ok: true, message: data, mode: "menu_image" });
    }

    // Sub-case B2: video/document/audio header — 2 calls (media, then menu)
    if (["video", "document", "audio"].includes(headerType)) {
      const fileUrl = template.header_media_url ? await signedMediaUrl(template.header_media_url) : null;
      let mediaResult: unknown = null;
      if (fileUrl) {
        mediaResult = await callUazapi("/send/media", {
          method: "POST",
          token: row.uazapi_token,
          body: {
            number: phone,
            type: mediaTypeForSend(headerType),
            file: fileUrl,
            docName: headerType === "document" ? template.header_media_doc_name || undefined : undefined,
            readchat: true,
            track_source: "accord_template",
            track_id: template.id,
          },
        });
        await sleep(1500);
      }

      const menuBody: Record<string, unknown> = {
        number: phone,
        type: menuType,
        text: bodyText,
        footerText: footerText || undefined,
        choices: menuType === "list" ? listChoices : choices,
        readchat: true,
        track_source: "accord_template",
        track_id: template.id,
      };
      if (menuType === "list") menuBody.listButton = "Ver opções";
      if (settings.simulate_typing) menuBody.delay = 3;

      const menuResult = await callUazapi("/send/menu", {
        method: "POST",
        token: row.uazapi_token,
        body: menuBody,
      });
      return json({ ok: true, media: mediaResult, menu: menuResult, mode: "media+menu" });
    }

    // Sub-case B3: text/none header — single /send/menu, no media
    const combinedText = headerText ? `${headerText}\n\n${bodyText}` : bodyText;
    const menuBody: Record<string, unknown> = {
      number: phone,
      type: menuType,
      text: combinedText,
      footerText: footerText || undefined,
      choices: menuType === "list" ? listChoices : choices,
      readchat: true,
      track_source: "accord_template",
      track_id: template.id,
    };
    if (menuType === "list") menuBody.listButton = "Ver opções";
    if (settings.simulate_typing) menuBody.delay = 3;

    const data = await callUazapi("/send/menu", {
      method: "POST",
      token: row.uazapi_token,
      body: menuBody,
    });
    return json({ ok: true, message: data, mode: "menu_text" });
  } catch (e: any) {
    console.error("uazapi-send-template:", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});
