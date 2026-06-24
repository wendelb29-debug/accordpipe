// deno-lint-ignore-file no-explicit-any
// Edge Function: sign-pdf-icp-restpki
// Alternativa ao sign-pdf-icp usando o REST PKI Core da Lacuna.
// Mantém a função legada intacta — esta é acionada quando o caller passa use_restpki=true
// ou quando a env USE_RESTPKI=true estiver definida.
//
// Fluxo PAdES (REST PKI Core v2):
//   1) START    POST {endpoint}/api/v2/pades-signatures
//   2) SIGN     hash retornado é assinado localmente com a chave privada do .pfx
//   3) FINISH   POST {endpoint}/api/v2/pades-signatures/{token}/signed-bytes
//
// Reaproveita:
//   - tabela pdf_contracts (id, pdf_url, servidor_id, icp_signed_at, icp_pdf_url)
//   - RPC get_effective_certificate (purpose=contract_signature)
//   - bucket storage digital-certificates (.pfx)
//   - CERT_ENCRYPTION_KEY (AES-GCM) para descriptografar a senha do .pfx
//   - bucket pdf-contracts para subir o PDF final (icp/...)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
// @ts-ignore - npm specifier para Deno Edge
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function uint8ToB64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}
function b64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type LoadedPfx = {
  privateKey: forge.pki.rsa.PrivateKey;
  cert: forge.pki.Certificate;
  certDerB64: string;
};

function loadPfxForRestPki(pfxB64: string, password: string): LoadedPfx {
  const der = forge.util.decode64(pfxB64);
  const asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);

  let privateKey: forge.pki.rsa.PrivateKey | null = null;
  let cert: forge.pki.Certificate | null = null;

  for (const sc of p12.safeContents) {
    for (const sb of sc.safeBags) {
      if ((sb.type === forge.pki.oids.pkcs8ShroudedKeyBag || sb.type === forge.pki.oids.keyBag) && sb.key) {
        privateKey = sb.key as forge.pki.rsa.PrivateKey;
      } else if (sb.type === forge.pki.oids.certBag && sb.cert) {
        // Pega o certificado folha (não-CA, com Basic Constraints CA=false ou sem extensão CA)
        if (!cert) cert = sb.cert;
        else {
          // Prefere o que NÃO é CA
          const ca = (sb.cert.getExtension as any)("basicConstraints")?.cA;
          if (ca === false) cert = sb.cert;
        }
      }
    }
  }
  if (!privateKey || !cert) throw new Error("PFX inválido: chave/certificado ausentes");

  const certAsn1 = forge.pki.certificateToAsn1(cert);
  const certDer = forge.asn1.toDer(certAsn1).getBytes();
  const certDerB64 = forge.util.encode64(certDer);

  return { privateKey, cert, certDerB64 };
}

function pickHashAlgo(name: string): forge.md.MessageDigest {
  const n = (name || "").toLowerCase();
  if (n.includes("512")) return forge.md.sha512.create();
  if (n.includes("384")) return forge.md.sha384.create();
  if (n.includes("1") && !n.includes("256")) return forge.md.sha1.create();
  return forge.md.sha256.create();
}

// Mapeia OID -> classe de digest do forge
function pickHashAlgoByOid(oid: string): forge.md.MessageDigest {
  switch (oid) {
    case "1.3.14.3.2.26": return forge.md.sha1.create();
    case "2.16.840.1.101.3.4.2.1": return forge.md.sha256.create();
    case "2.16.840.1.101.3.4.2.2": return forge.md.sha384.create();
    case "2.16.840.1.101.3.4.2.3": return forge.md.sha512.create();
    default: return forge.md.sha256.create();
  }
}

/**
 * Assina um digest cru (já calculado, ex.: toSignHash do REST PKI) usando RSASSA-PKCS1-v1_5
 * envelopando em DigestInfo conforme PKCS#1. É o que o REST PKI espera quando devolve apenas o hash.
 */
function rsaSignDigest(privateKey: forge.pki.rsa.PrivateKey, digest: Uint8Array, digestOid: string): string {
  // Forge expõe md.digest() = ByteStringBuffer; reaproveitamos via objeto fake
  // Constrói DigestInfo manualmente para garantir o algoritmo correto
  const digestInfoOid = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(digestOid).getBytes()),
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ""),
    ]),
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false,
      forge.util.binary.raw.encode(digest) as unknown as string,
    ),
  ]);
  const diBytes = forge.asn1.toDer(digestInfoOid).getBytes();
  const signature = (privateKey as any).sign({ // forge accepts a buffer-like with digest()
    digest: () => ({ getBytes: () => diBytes }),
    algorithm: "RSA",
  });
  return forge.util.encode64(signature);
}

/** Tenta extrair o "to-sign hash" e oid do digest a partir do response do START em diferentes formas. */
function extractToSignHash(startResp: any): { hash: Uint8Array; digestOid: string; digestAlgName: string; token: string } {
  const token = startResp.token || startResp.signatureToken || startResp.sessionToken;
  if (!token) throw new Error("REST PKI START sem token");

  const hashB64 =
    startResp.toSignHash ||
    startResp.toSignBytes ||
    startResp.toSignData ||
    startResp.signatureAlgorithmParameters?.toSignHash ||
    null;
  if (!hashB64) throw new Error("REST PKI START sem toSignHash");

  const digestOid =
    startResp.digestAlgorithmOid ||
    startResp.digestAlgorithm?.oid ||
    startResp.signatureAlgorithm?.digestAlgorithmOid ||
    "2.16.840.1.101.3.4.2.1"; // default sha256

  const digestAlgName =
    startResp.digestAlgorithmName ||
    startResp.digestAlgorithm?.name ||
    "SHA-256";

  return {
    hash: b64ToUint8(hashB64),
    digestOid,
    digestAlgName,
    token,
  };
}

function extractSignedPdf(finishResp: any): Uint8Array | null {
  const b64 =
    finishResp.signedPdf?.content ||
    finishResp.signedBytes ||
    finishResp.signedPdfBytes ||
    finishResp.signedFileBytes ||
    finishResp.bytes ||
    null;
  if (b64) return b64ToUint8(b64);
  const url = finishResp.signedPdf?.url || finishResp.signedFileUrl || finishResp.url;
  if (url) return null; // caller fará o fetch
  return null;
}

async function callRestPki(path: string, body: any, endpoint: string, apiKey: string) {
  const url = `${endpoint.replace(/\/+$/, "")}${path}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // REST PKI Core aceita os dois esquemas — enviamos ambos
      "Authorization": `Bearer ${apiKey}`,
      "X-Api-Key": apiKey,
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`REST PKI ${path} -> HTTP ${resp.status}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`REST PKI ${path} resposta não-JSON: ${text.slice(0, 300)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const contractId: string | undefined = body?.contract_id;
    if (!contractId) {
      return new Response(JSON.stringify({ ok: false, error: "missing contract_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESTPKI_ENDPOINT = (Deno.env.get("RESTPKI_ENDPOINT") || "").trim();
    const RESTPKI_API_KEY = (Deno.env.get("RESTPKI_API_KEY") || "").trim();
    if (!RESTPKI_ENDPOINT || !RESTPKI_API_KEY) {
      return new Response(JSON.stringify({
        ok: false,
        error: "restpki_not_configured",
        message: "RESTPKI_ENDPOINT e RESTPKI_API_KEY são obrigatórios para usar a integração Lacuna REST PKI Core.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Política/contexto ICP-Brasil PAdES (overridable por env)
    const POLICY = Deno.env.get("RESTPKI_PADES_POLICY") || "PkiBrazilPadesAdrBasica";
    const CONTEXT = Deno.env.get("RESTPKI_SECURITY_CONTEXT") || "PkiBrazil";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Contrato
    console.log("[restpki] load contract", contractId);
    const { data: contract, error: cErr } = await supabase
      .from("pdf_contracts")
      .select("id, pdf_url, servidor_id, icp_signed_at, icp_pdf_url")
      .eq("id", contractId)
      .maybeSingle();
    if (cErr || !contract) throw new Error(`Contrato não encontrado: ${cErr?.message}`);
    if (contract.icp_signed_at && contract.icp_pdf_url) {
      return new Response(JSON.stringify({ ok: true, already_signed: true, icp_pdf_url: contract.icp_pdf_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!contract.pdf_url) throw new Error("Contrato sem pdf_url");

    // 2) Baixar PDF original
    const pdfResp = await fetch(contract.pdf_url);
    if (!pdfResp.ok) throw new Error(`Falha ao baixar PDF: ${pdfResp.status}`);
    const originalPdf = new Uint8Array(await pdfResp.arrayBuffer());
    const originalPdfB64 = uint8ToB64(originalPdf);

    // 3) Resolver certificado A1 (mesma lógica do sign-pdf-icp)
    let PFX_B64: string | null = null;
    let PFX_PASS: string | null = null;
    let usedCertId: string | null = null;
    let usedCertScope: "tenant" | "global" | "legacy" = "legacy";
    try {
      const { data: eff } = await supabase.rpc("get_effective_certificate", {
        _tenant_id: contract.servidor_id,
        _purpose: "contract_signature",
      });
      const row = Array.isArray(eff) ? eff[0] : eff;
      if (row?.storage_path && row.storage_path !== "n/a") {
        if (row.valid_until && new Date(row.valid_until) <= new Date()) {
          throw new Error("Certificado vencido — assinatura bloqueada");
        }
        const dl = await supabase.storage.from("digital-certificates").download(row.storage_path);
        if (!dl.error && dl.data) {
          const buf = new Uint8Array(await dl.data.arrayBuffer());
          PFX_B64 = uint8ToB64(buf);
          const keyRaw = (Deno.env.get("CERT_ENCRYPTION_KEY") || "").trim();
          if (!keyRaw) throw new Error("CERT_ENCRYPTION_KEY não configurado");
          let keyBytes: Uint8Array | null = null;
          try { const bin = atob(keyRaw); if (bin.length === 32) { keyBytes = new Uint8Array(32); for (let i = 0; i < 32; i++) keyBytes[i] = bin.charCodeAt(i); } } catch (_) {}
          if (!keyBytes && /^[0-9a-fA-F]{64}$/.test(keyRaw)) {
            keyBytes = new Uint8Array(32);
            for (let i = 0; i < 32; i++) keyBytes[i] = parseInt(keyRaw.substr(i * 2, 2), 16);
          }
          if (!keyBytes) throw new Error("CERT_ENCRYPTION_KEY deve ter 32 bytes em base64 ou 64 chars hex.");
          const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
          const ct = b64ToUint8(row.password_encrypted);
          const iv = b64ToUint8(row.password_iv);
          PFX_PASS = new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
          usedCertId = row.id;
          usedCertScope = row.is_global ? "global" : "tenant";
        }
      }
    } catch (e) {
      console.warn("[restpki] falha ao resolver cert da tabela, tentando legado:", (e as any)?.message);
    }
    if (!PFX_B64 || !PFX_PASS) {
      PFX_B64 = Deno.env.get("ACCORD_A1_PFX_BASE64") || null;
      PFX_PASS = Deno.env.get("ACCORD_A1_PFX_PASSWORD") || null;
      usedCertScope = "legacy";
    }
    if (!PFX_B64 || !PFX_PASS) {
      await supabase.from("certificate_usage_logs").insert({
        tenant_id: contract.servidor_id, purpose: "contract_signature",
        target_type: "pdf_contracts", target_id: contract.id,
        success: false, message: "no_certificate_for_contract_signature_restpki",
      });
      return new Response(JSON.stringify({
        ok: false, error: "not_configured",
        message: "Nenhum certificado A1 habilitado para assinatura de contratos.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { privateKey, cert, certDerB64 } = loadPfxForRestPki(PFX_B64, PFX_PASS);
    const signerCN = (cert.subject.getField("CN") as any)?.value || "ICP-Brasil";
    const certValidUntil = cert.validity.notAfter.toISOString();
    if (new Date(certValidUntil) <= new Date()) throw new Error("Certificado A1 vencido");

    // 4) START
    console.log("[restpki] START pades-signatures");
    const startResp = await callRestPki("/api/v2/pades-signatures", {
      pdfToSign: { content: originalPdfB64 },
      certificate: certDerB64,
      signaturePolicyId: POLICY,
      securityContextId: CONTEXT,
    }, RESTPKI_ENDPOINT, RESTPKI_API_KEY);

    const { hash, digestOid, digestAlgName, token } = extractToSignHash(startResp);
    console.log("[restpki] START ok token=", token, "digest=", digestAlgName, digestOid);

    // 5) SIGN (RSA PKCS#1 v1.5 sobre o digest)
    const signatureB64 = rsaSignDigest(privateKey, hash, digestOid);
    console.log("[restpki] signed digest len=", signatureB64.length);

    // 6) FINISH
    console.log("[restpki] FINISH pades-signatures/", token);
    const finishResp = await callRestPki(`/api/v2/pades-signatures/${encodeURIComponent(token)}/signed-bytes`, {
      signature: signatureB64,
    }, RESTPKI_ENDPOINT, RESTPKI_API_KEY);

    let signedPdf = extractSignedPdf(finishResp);
    if (!signedPdf) {
      const url: string | undefined = finishResp.signedPdf?.url || finishResp.signedFileUrl || finishResp.url;
      if (!url) throw new Error("REST PKI FINISH sem PDF assinado nem URL");
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Falha ao baixar PDF assinado: ${r.status}`);
      signedPdf = new Uint8Array(await r.arrayBuffer());
    }

    // 7) Upload do PDF assinado
    const signedPath = `icp/${contract.id}/restpki-${Date.now()}.pdf`;
    const up = await supabase.storage.from("pdf-contracts").upload(signedPath, signedPdf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (up.error) throw new Error(`Falha ao subir PDF assinado: ${up.error.message}`);
    const { data: pub } = supabase.storage.from("pdf-contracts").getPublicUrl(signedPath);
    const icpPdfUrl = pub.publicUrl;

    // 8) Atualizar pdf_contracts
    const signedAt = new Date().toISOString();
    const { error: uErr } = await supabase
      .from("pdf_contracts")
      .update({
        icp_pdf_url: icpPdfUrl,
        icp_signed_at: signedAt,
        icp_signer_cn: signerCN,
        icp_tsa_authority: "Lacuna REST PKI Core",
      })
      .eq("id", contract.id);
    if (uErr) console.warn("[restpki] update pdf_contracts:", uErr.message);

    // 9) Log
    await supabase.from("certificate_usage_logs").insert({
      tenant_id: contract.servidor_id,
      certificate_id: usedCertId,
      purpose: "contract_signature",
      target_type: "pdf_contracts",
      target_id: contract.id,
      success: true,
      message: "signed_via_restpki",
      metadata: {
        provider: "lacuna_restpki_core",
        policy: POLICY,
        security_context: CONTEXT,
        digest_algorithm: digestAlgName,
        digest_oid: digestOid,
        cert_scope: usedCertScope,
        signer_cn: signerCN,
      },
    });

    return new Response(JSON.stringify({
      ok: true,
      provider: "lacuna_restpki_core",
      icp_pdf_url: icpPdfUrl,
      signed_at: signedAt,
      signer_cn: signerCN,
      tsa_authority: "Lacuna REST PKI Core",
      policy: POLICY,
      security_context: CONTEXT,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[restpki] erro:", err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
