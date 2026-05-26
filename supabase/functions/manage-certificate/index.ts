// Edge Function: manage-certificate
// Gerencia certificados digitais A1 (.pfx) com criptografia AES-256-GCM da senha.
//
// Ações:
//   - upload:   { action:'upload', tenant_id?, is_global?, name, file_b64, password, environment, use_master_global? }
//               -> salva .pfx em bucket privado, cifra senha, faz parse e devolve metadados.
//   - test:     { action:'test', cert_id } -> decifra senha, abre PFX, faz assinatura PKCS#7 dummy.
//   - delete:   { action:'delete', cert_id }
//   - set_use_global: { action:'set_use_global', tenant_id, use:boolean }
//
// Requer secret: CERT_ENCRYPTION_KEY (32 bytes em base64 ou hex)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import forge from "https://esm.sh/node-forge@1.3.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "digital-certificates";

// ICP-Brasil root common-name fragments (heurística — cobre AC Raiz V2..V10)
const ICP_BRASIL_ROOTS = [
  "AC Raiz Brasileira",
  "Autoridade Certificadora Raiz Brasileira",
  "ICP-Brasil",
];

function getKey(): Uint8Array {
  const raw = (Deno.env.get("CERT_ENCRYPTION_KEY") || "").trim();
  if (!raw) {
    throw new Error("CERT_ENCRYPTION_KEY não configurado. Gere com: openssl rand -base64 32");
  }
  // Aceita SOMENTE base64 com 32 bytes reais OU hex com 64 caracteres.
  // base64
  try {
    const bin = atob(raw);
    if (bin.length === 32) {
      const out = new Uint8Array(32);
      for (let i = 0; i < 32; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
  } catch (_) { /* not base64 */ }
  // hex
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = parseInt(raw.substr(i * 2, 2), 16);
    return out;
  }
  throw new Error("CERT_ENCRYPTION_KEY deve ter exatamente 32 bytes em base64 ou 64 caracteres hex.");
}

async function encryptPassword(plain: string): Promise<{ cipher: string; iv: string }> {
  const key = await crypto.subtle.importKey("raw", getKey(), { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plain);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  return { cipher: btoa(String.fromCharCode(...ct)), iv: btoa(String.fromCharCode(...iv)) };
}

async function decryptPassword(cipherB64: string, ivB64: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", getKey(), { name: "AES-GCM" }, false, ["decrypt"]);
  const ct = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

function parsePfx(b64: string, password: string) {
  const der = forge.util.decode64(b64.replace(/\s+/g, ""));
  const asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags = (p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [])
    .concat(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []);
  if (!certBags.length || !keyBags.length) throw new Error("PFX inválido: sem certificado/chave");

  // titular = cert sem isCA
  let owner: any = certBags.find((b: any) => b.cert && !b.cert.isCA)?.cert || certBags[0].cert;
  const chain = certBags.map((b: any) => b.cert);
  const issuerCN = owner.issuer.getField("CN")?.value || "";
  const subjectCN = owner.subject.getField("CN")?.value || "";
  // CNPJ/CPF normalmente em otherName / subjectAltName (otherName.value contém OID 2.16.76.1.3.x)
  let document = "";
  const cnMatch = subjectCN.match(/(\d{11}|\d{14})/);
  if (cnMatch) document = cnMatch[1];

  const rootCN = chain[chain.length - 1]?.issuer.getField("CN")?.value || issuerCN;
  const isIcp = ICP_BRASIL_ROOTS.some(r => (issuerCN + " " + rootCN).toLowerCase().includes(r.toLowerCase()));

  return {
    holder_name: subjectCN,
    holder_document: document,
    issuer: issuerCN,
    serial_number: owner.serialNumber,
    valid_from: owner.validity.notBefore.toISOString(),
    valid_until: owner.validity.notAfter.toISOString(),
    is_icp_brasil: isIcp,
    privateKey: keyBags[0].key,
    cert: owner,
  };
}

function onlyDigits(s: string | null | undefined) { return (s || "").replace(/\D/g, ""); }

async function logUsage(supa: any, params: {
  certificate_id?: string | null;
  tenant_id?: string | null;
  purpose: string;
  target_type?: string | null;
  target_id?: string | null;
  success?: boolean;
  message?: string | null;
  metadata?: any;
  user_id?: string | null;
}) {
  try {
    await supa.from("certificate_usage_logs").insert({
      certificate_id: params.certificate_id || null,
      tenant_id: params.tenant_id || null,
      purpose: params.purpose,
      target_type: params.target_type || null,
      target_id: params.target_id || null,
      success: params.success !== false,
      message: params.message || null,
      metadata: params.metadata || {},
      user_id: params.user_id || null,
    });
  } catch (e) { console.warn("usage log fail", (e as any)?.message); }
}

async function handleUpload(supa: any, userId: string, body: any) {
  const {
    name, file_b64, password,
    is_global = false, tenant_id = null, use_master_global = false,
    uso_nfe = false, uso_assinatura_contratos = true,
    ambiente_nfe = "homologacao",
  } = body;
  if (!name || !file_b64 || !password) throw new Error("name, file_b64 e password são obrigatórios");
  if (!uso_nfe && !uso_assinatura_contratos) throw new Error("Selecione ao menos uma finalidade (NF-e ou Contratos)");

  // parse antes de salvar — falha rápido
  const meta = parsePfx(file_b64, password);

  // Validação CNPJ para NF-e (cert do titular precisa bater com o CNPJ do tenant)
  if (uso_nfe && !is_global && tenant_id) {
    const { data: company } = await supa.from("companies").select("cnpj").eq("id", tenant_id).single();
    const tenantCnpj = onlyDigits(company?.cnpj);
    const certCnpj = onlyDigits(meta.holder_document);
    if (!tenantCnpj || !certCnpj || tenantCnpj !== certCnpj) {
      throw new Error(`CNPJ do certificado (${certCnpj || "vazio"}) não confere com o CNPJ do tenant (${tenantCnpj || "vazio"}). NF-e exige certificado do próprio titular.`);
    }
  }

  // path no bucket privado
  const scope = is_global ? "global" : `tenant/${tenant_id}`;
  const path = `${scope}/${crypto.randomUUID()}.pfx`;

  // upload via service role (bucket privado, sem RLS)
  const buf = Uint8Array.from(atob(file_b64.replace(/\s+/g, "")), c => c.charCodeAt(0));
  const up = await supa.storage.from(BUCKET).upload(path, buf, {
    contentType: "application/x-pkcs12",
    upsert: false,
  });
  if (up.error) throw new Error("Falha no upload: " + up.error.message);

  // cifra senha
  const { cipher, iv } = await encryptPassword(password);

  // desativa anteriores
  if (is_global) {
    await supa.from("tenant_certificates").update({ is_active: false }).eq("is_global", true).eq("is_active", true);
  } else {
    await supa.from("tenant_certificates").update({ is_active: false }).eq("tenant_id", tenant_id).eq("is_active", true);
  }

  const { data: ins, error: insErr } = await supa.from("tenant_certificates").insert({
    tenant_id: is_global ? null : tenant_id,
    is_global,
    name,
    storage_path: path,
    password_encrypted: cipher,
    password_iv: iv,
    holder_name: meta.holder_name,
    holder_document: meta.holder_document,
    issuer: meta.issuer,
    serial_number: meta.serial_number,
    valid_from: meta.valid_from,
    valid_until: meta.valid_until,
    environment: ambiente_nfe === "producao" ? "producao" : "homologacao",
    is_active: true,
    is_icp_brasil: meta.is_icp_brasil,
    use_master_global,
    uso_nfe,
    uso_assinatura_contratos,
    ambiente_nfe,
    ambiente_assinatura: "producao",
    uploaded_by: userId,
    last_test_status: "pending",
  }).select().single();
  if (insErr) throw new Error(insErr.message);

  await logUsage(supa, {
    certificate_id: ins.id, tenant_id: is_global ? null : tenant_id,
    purpose: "upload", user_id: userId,
    metadata: { is_global, uso_nfe, uso_assinatura_contratos, ambiente_nfe, is_icp_brasil: meta.is_icp_brasil },
  });

  return ins;
}

async function handleValidate(supa: any, certId: string, userId: string) {
  const { data: cert, error } = await supa.from("tenant_certificates")
    .select("id, tenant_id, valid_until, is_icp_brasil, holder_document, uso_nfe").eq("id", certId).single();
  if (error || !cert) throw new Error("Certificado não encontrado");
  const expired = new Date(cert.valid_until) <= new Date();
  let cnpjOk = true;
  if (cert.uso_nfe && cert.tenant_id) {
    const { data: company } = await supa.from("companies").select("cnpj").eq("id", cert.tenant_id).single();
    cnpjOk = onlyDigits(company?.cnpj) === onlyDigits(cert.holder_document);
  }
  const ok = !expired && cert.is_icp_brasil && cnpjOk;
  const msg = expired ? "Expirado" : !cert.is_icp_brasil ? "Não-ICP-Brasil" : !cnpjOk ? "CNPJ não confere com o tenant" : "Válido";
  await logUsage(supa, { certificate_id: certId, tenant_id: cert.tenant_id, purpose: "validate", success: ok, message: msg, user_id: userId });
  return { ok, message: msg, expired, is_icp_brasil: cert.is_icp_brasil, cnpj_ok: cnpjOk };
}

async function handleTest(supa: any, certId: string) {
  const { data: cert, error } = await supa.from("tenant_certificates").select("*").eq("id", certId).single();
  if (error || !cert) throw new Error("Certificado não encontrado");
  const dl = await supa.storage.from(BUCKET).download(cert.storage_path);
  if (dl.error) throw new Error("Falha ao baixar PFX: " + dl.error.message);
  const buf = new Uint8Array(await dl.data.arrayBuffer());
  const b64 = btoa(String.fromCharCode(...buf));
  const password = await decryptPassword(cert.password_encrypted, cert.password_iv);
  const meta = parsePfx(b64, password);

  // assinatura PKCS#7 dummy para validar que a chave privada funciona
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer("accord-cert-test-" + Date.now(), "utf8");
  p7.addCertificate(meta.cert);
  p7.addSigner({
    key: meta.privateKey,
    certificate: meta.cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date().toString() },
    ],
  });
  p7.sign({ detached: true });

  const now = new Date();
  const expired = new Date(meta.valid_until) <= now;
  const status = expired ? "expired" : (meta.is_icp_brasil ? "ok" : "ok_non_icp");
  const message = expired
    ? "Certificado expirado"
    : (meta.is_icp_brasil ? "Assinatura de teste OK • ICP-Brasil válido" : "Assinatura de teste OK • Não-ICP-Brasil");

  await supa.from("tenant_certificates").update({
    last_test_at: now.toISOString(),
    last_test_status: status,
    last_test_message: message,
    is_icp_brasil: meta.is_icp_brasil,
    valid_until: meta.valid_until,
  }).eq("id", certId);

  return { status, message, valid_until: meta.valid_until, is_icp_brasil: meta.is_icp_brasil };
}

async function handleDelete(supa: any, certId: string, userId: string) {
  const { data: cert } = await supa.from("tenant_certificates").select("storage_path, tenant_id").eq("id", certId).single();
  if (cert?.storage_path && cert.storage_path !== "n/a") await supa.storage.from(BUCKET).remove([cert.storage_path]);
  const { error } = await supa.from("tenant_certificates").delete().eq("id", certId);
  if (error) throw new Error(error.message);
  await logUsage(supa, { certificate_id: certId, tenant_id: cert?.tenant_id || null, purpose: "delete", user_id: userId });
  return { ok: true };
}

async function handleSetUseGlobal(supa: any, tenantId: string, use: boolean, userId: string) {
  const { error } = await supa.from("tenant_certificates")
    .update({ use_master_global: use })
    .eq("tenant_id", tenantId);
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  const { data: anyRow } = await supa.from("tenant_certificates").select("id").eq("tenant_id", tenantId).limit(1);
  if (!anyRow || anyRow.length === 0) {
    await supa.from("tenant_certificates").insert({
      tenant_id: tenantId, is_global: false, name: "Usar certificado global do master",
      storage_path: "n/a", password_encrypted: "n/a", password_iv: "n/a",
      use_master_global: use, is_active: false,
    });
  }
  await logUsage(supa, { tenant_id: tenantId, purpose: "toggle_global", message: use ? "ativado" : "desativado", user_id: userId });
  return { ok: true };
}

async function handleUpdatePurpose(supa: any, body: any, userId: string) {
  const { cert_id, uso_nfe, uso_assinatura_contratos, ambiente_nfe } = body;
  if (!cert_id) throw new Error("cert_id obrigatório");
  const patch: any = {};
  if (typeof uso_nfe === "boolean") patch.uso_nfe = uso_nfe;
  if (typeof uso_assinatura_contratos === "boolean") patch.uso_assinatura_contratos = uso_assinatura_contratos;
  if (ambiente_nfe === "homologacao" || ambiente_nfe === "producao") patch.ambiente_nfe = ambiente_nfe;

  if (patch.uso_nfe === true) {
    const { data: cert } = await supa.from("tenant_certificates").select("tenant_id, holder_document, is_global").eq("id", cert_id).single();
    if (cert && !cert.is_global && cert.tenant_id) {
      const { data: company } = await supa.from("companies").select("cnpj").eq("id", cert.tenant_id).single();
      if (onlyDigits(company?.cnpj) !== onlyDigits(cert.holder_document)) {
        throw new Error("CNPJ do certificado não confere com o tenant. NF-e bloqueada.");
      }
    }
  }
  const { data, error } = await supa.from("tenant_certificates").update(patch).eq("id", cert_id).select().single();
  if (error) throw new Error(error.message);
  await logUsage(supa, { certificate_id: cert_id, tenant_id: data.tenant_id, purpose: "validate", user_id: userId, message: "purpose updated", metadata: patch });
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(SUPA_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const supa = createClient(SUPA_URL, SERVICE);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    // RBAC: master OU ceo
    const { data: isMasterRow } = await supa.from("profiles").select("is_master, company_id").eq("user_id", user.id).single();
    const { data: roles } = await supa.from("user_roles").select("role").eq("user_id", user.id);
    const roleList = (roles || []).map((r: any) => r.role);
    const isMaster = !!isMasterRow?.is_master || roleList.includes("master");
    const isCeo = roleList.includes("ceo");
    if (!isMaster && !isCeo) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const action = body.action;

    // Enforce escopo: CEO só mexe no próprio tenant, nunca global
    if (!isMaster) {
      const tid = isMasterRow?.company_id;
      if (body.is_global) return new Response(JSON.stringify({ error: "Apenas master pode gerenciar o certificado global" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
      if (body.tenant_id && body.tenant_id !== tid) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
      body.tenant_id = tid;
    }

    let result;
    if (action === "upload") result = await handleUpload(supa, user.id, body);
    else if (action === "test") result = await handleTest(supa, body.cert_id);
    else if (action === "validate") result = await handleValidate(supa, body.cert_id, user.id);
    else if (action === "delete") result = await handleDelete(supa, body.cert_id, user.id);
    else if (action === "set_use_global") result = await handleSetUseGlobal(supa, body.tenant_id, !!body.use, user.id);
    else if (action === "update_purpose") result = await handleUpdatePurpose(supa, body, user.id);
    else return new Response(JSON.stringify({ error: "Ação desconhecida" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    // audit (log estrutural)
    await supa.from("audit_logs").insert({
      user_id: user.id, user_name: user.email,
      action: `certificate.${action}`,
      target_type: "tenant_certificates",
      target_id: result?.id || body.cert_id || body.tenant_id || null,
      servidor_id: isMasterRow?.company_id || null,
      details: { is_global: !!body.is_global, uso_nfe: body.uso_nfe ?? null, uso_assinatura_contratos: body.uso_assinatura_contratos ?? null, ambiente_nfe: body.ambiente_nfe ?? null },
    });

    return new Response(JSON.stringify({ ok: true, data: result }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("manage-certificate error:", e);
    return new Response(JSON.stringify({ error: e?.message || "internal" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
