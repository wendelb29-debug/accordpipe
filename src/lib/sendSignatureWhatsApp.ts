import { supabase } from "@/integrations/supabase/client";

/**
 * Multi-tenant strict: sends signature link via the tenant's connected WhatsApp
 * (Accord Stack). Resolves contact in whatsapp_contacts of THIS tenant only,
 * registers the message in whatsapp_messages of THIS tenant only.
 *
 * Never crosses tenant boundaries: tenant_id is mandatory and used as the
 * filter for every query and insert.
 */
export interface SendSignatureWhatsAppInput {
  tenantId: string;
  tenantName?: string | null;
  signerName: string;
  signerPhone: string | null | undefined;
  signerToken: string;
  documentName: string;
  leadId?: string | null;
  workspaceId?: string | null;
  ownerName?: string | null;
}

const normalizePhone = (raw: string): string => raw.replace(/\D/g, "");

const buildLink = (token: string): string => {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  return `${origin}/assinar-documento/${token}`;
};

const buildMessage = (params: {
  signerName: string;
  documentName: string;
  link: string;
  tenantName?: string | null;
  ownerName?: string | null;
}): string => {
  const greetingName = (params.signerName || "").trim() || "tudo bem";
  const tenant = (params.tenantName || "").trim();
  const owner = (params.ownerName || "").trim();
  const signature = tenant || owner || "Equipe Accord";

  return [
    `Olá ${greetingName}! 📝`,
    "",
    "Seu documento para assinatura já está disponível.",
    "",
    `📄 Documento: ${params.documentName}`,
    "",
    "Como assinar:",
    "1. Acesse o link abaixo",
    "2. Informe seus dados de validação",
    "3. Confirme sua assinatura",
    "",
    `🔗 ${params.link}`,
    "",
    "Se precisar de ajuda, responda esta mensagem.",
    "",
    "Atenciosamente,",
    signature,
  ].join("\n");
};

export async function sendSignatureLinkViaWhatsApp(
  input: SendSignatureWhatsAppInput,
): Promise<{ success: boolean; message: string }> {
  if (!input.tenantId) {
    return { success: false, message: "Tenant não identificado." };
  }
  if (!input.signerPhone || !input.signerPhone.trim()) {
    return { success: false, message: "Signatário sem telefone cadastrado." };
  }

  const phone = normalizePhone(input.signerPhone);
  if (phone.length < 10) {
    return { success: false, message: "Telefone inválido." };
  }

  const link = buildLink(input.signerToken);
  const text = buildMessage({
    signerName: input.signerName,
    documentName: input.documentName,
    link,
    tenantName: input.tenantName,
    ownerName: input.ownerName,
  });

  // --- Tenant-isolated contact resolution (whatsapp_contacts) ---
  // Only look up / create contact within the SAME tenant (company_id = tenantId).
  let contactId: string | null = null;
  try {
    const { data: existing } = await supabase
      .from("whatsapp_contacts")
      .select("id")
      .eq("company_id", input.tenantId)
      .eq("phone", phone)
      .maybeSingle();

    if (existing?.id) {
      contactId = existing.id;
    } else {
      const { data: created } = await supabase
        .from("whatsapp_contacts")
        .insert({
          company_id: input.tenantId,
          phone,
          name: input.signerName || phone,
          lead_id: input.leadId ?? null,
          workspace_id: input.workspaceId ?? null,
          last_message: text.slice(0, 200),
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      contactId = created?.id ?? null;
    }
  } catch (err) {
    console.error("[sendSignatureWhatsApp] contact lookup failed", err);
  }

  // --- Pre-register outbound message (tenant-scoped) so it appears in chat ---
  let messageId: string | null = null;
  if (contactId) {
    const { data: msg } = await supabase
      .from("whatsapp_messages")
      .insert({
        company_id: input.tenantId,
        contact_id: contactId,
        phone,
        message: text,
        direction: "outbound",
        status: "pending",
        message_type: "text",
        metadata: {
          source: "signature_automation",
          document_name: input.documentName,
          signer_token: input.signerToken,
        },
      })
      .select("id")
      .single();
    messageId = msg?.id ?? null;

    await supabase
      .from("whatsapp_contacts")
      .update({
        last_message: text.slice(0, 200),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", contactId)
      .eq("company_id", input.tenantId);
  }

  // --- Send via tenant's connected WhatsApp instance (whatsapp-send enforces tenant) ---
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: {
      tenant_id: input.tenantId,
      phone,
      text,
      message_id: messageId,
    },
  });

  if (error) {
    console.error("[sendSignatureWhatsApp] invoke error", error);
    return { success: false, message: error.message || "Falha no envio" };
  }
  if (data && data.success === false) {
    return { success: false, message: data.message || "Falha no envio" };
  }
  return { success: true, message: "Link enviado por WhatsApp." };
}
