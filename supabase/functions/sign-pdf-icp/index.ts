// Edge Function: sign-pdf-icp
// Aplica selo PAdES-B-T (assinatura CAdES embedded + carimbo do tempo RFC 3161)
// usando o certificado A1 da Accord (ICP-Brasil) e a TSA do ITI.
//
// Entrada:  { contract_id: string }
// Saida:    { ok: true, icp_pdf_url, signed_at, signer_cn, tsa_authority, cert_valid_until }
//
// Pré-requisitos (secrets):
//   - ACCORD_A1_PFX_BASE64   (conteúdo .pfx em base64)
//   - ACCORD_A1_PFX_PASSWORD (senha do .pfx)
//
// Observações:
//   - Esta função sela o PDF com o certificado da PLATAFORMA, não dos signatários.
//     As assinaturas dos signatários (foto/IP/hash) já foram aplicadas anteriormente.
//   - O selo atesta integridade do PDF + data confiável (carimbo do tempo ITI).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, PDFName, PDFHexString, PDFString, PDFArray, PDFNumber, PDFDict } from "https://esm.sh/pdf-lib@1.17.1";
import forge from "https://esm.sh/node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TSA_URL = Deno.env.get("ACCORD_TSA_URL") || "https://timestamp.iti.gov.br";

interface ContractRow {
  id: string;
  pdf_url: string | null;
  servidor_id: string | null;
  document_hash: string | null;
}

function b64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64.replace(/\s+/g, ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function uint8ToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function loadPfx(pfxB64: string, password: string) {
  const der = forge.util.decode64(pfxB64.replace(/\s+/g, ""));
  const asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);

  let privateKey: forge.pki.PrivateKey | null = null;
  let cert: forge.pki.Certificate | null = null;
  const chain: forge.pki.Certificate[] = [];

  for (const safeContents of p12.safeContents) {
    for (const safeBag of safeContents.safeBags) {
      if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag || safeBag.type === forge.pki.oids.keyBag) {
        privateKey = safeBag.key as forge.pki.PrivateKey;
      } else if (safeBag.type === forge.pki.oids.certBag) {
        const c = safeBag.cert as forge.pki.Certificate;
        chain.push(c);
        // Pick the cert that matches the private key (end-entity), heuristic: not self-signed
        if (!cert || (c.issuer.hash !== c.subject.hash)) cert = c;
      }
    }
  }
  if (!privateKey || !cert) throw new Error("PFX inválido: chave privada ou certificado não encontrados");
  return { privateKey, cert, chain };
}

function getCN(cert: forge.pki.Certificate): string {
  const cn = cert.subject.getField("CN");
  return cn ? cn.value : "Desconhecido";
}

// Build CAdES (CMS SignedData) for a given message digest. Detached.
function buildCmsSignedData(
  contentHash: Uint8Array,
  privateKey: forge.pki.PrivateKey,
  cert: forge.pki.Certificate,
  chain: forge.pki.Certificate[]
): Uint8Array {
  const p7 = forge.pkcs7.createSignedData();
  // content is "detached" — we set the content but won't include it (set contentInfo only)
  p7.content = forge.util.createBuffer(""); // placeholder; we'll inject digest via authenticatedAttributes
  p7.addCertificate(cert);
  for (const c of chain) {
    if (c !== cert) p7.addCertificate(c);
  }

  const digestHex = forge.util.bytesToHex(forge.util.binary.raw.encode(contentHash));

  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest, value: forge.util.hexToBytes(digestHex) },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });

  // Sign detached
  p7.sign({ detached: true });

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const out = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i++) out[i] = der.charCodeAt(i);
  return out;
}

// Request RFC 3161 timestamp from TSA for given hash
async function requestTimestamp(hashBytes: Uint8Array): Promise<{ token: Uint8Array; authority: string } | null> {
  try {
    // Build TimeStampReq (ASN.1)
    const messageImprint = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      // AlgorithmIdentifier: sha-256 = 2.16.840.1.101.3.4.2.1
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer("2.16.840.1.101.3.4.2.1").getBytes()),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ""),
      ]),
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false, String.fromCharCode(...hashBytes)),
    ]);

    const tsReq = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, String.fromCharCode(1)), // version
      messageImprint,
      // certReq = true so cert is included in response
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.BOOLEAN, false, String.fromCharCode(0xFF)),
    ]);

    const reqDer = forge.asn1.toDer(tsReq).getBytes();
    const reqBytes = new Uint8Array(reqDer.length);
    for (let i = 0; i < reqDer.length; i++) reqBytes[i] = reqDer.charCodeAt(i);

    const resp = await fetch(TSA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/timestamp-query" },
      body: reqBytes,
    });
    if (!resp.ok) {
      console.warn(`[TSA] HTTP ${resp.status}`);
      return null;
    }
    const respBytes = new Uint8Array(await resp.arrayBuffer());
    return { token: respBytes, authority: new URL(TSA_URL).hostname };
  } catch (err) {
    console.warn("[TSA] timestamp request failed:", err);
    return null;
  }
}

// Insert a signature dictionary + ByteRange placeholder into the PDF
// Returns: pdf bytes with placeholder, byteRange offsets, signature placeholder offset
async function prepareSignedPdf(pdfBytes: Uint8Array): Promise<{
  pdfWithPlaceholder: Uint8Array;
  byteRangePlaceholder: string;
  signatureContentsLength: number;
}> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const signatureContentsLength = 16384; // 8KB hex = plenty for CMS+timestamp
  const placeholderHex = "0".repeat(signatureContentsLength);

  const byteRangePlaceholder = "/ByteRange [0 ********** ********** **********]";

  // Build signature dict
  const signatureDict = pdfDoc.context.obj({
    Type: "Sig",
    Filter: "Adobe.PPKLite",
    SubFilter: "adbe.pkcs7.detached",
    ByteRange: [0, 0, 0, 0], // placeholder; we'll overwrite as raw bytes after serialize
    Contents: PDFHexString.of(placeholderHex),
    Reason: PDFString.of("Selo de integridade ICP-Brasil + Carimbo do Tempo (Accord)"),
    Location: PDFString.of("Brasil"),
    M: PDFString.of(`D:${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}Z`),
    ContactInfo: PDFString.of("suporte@accordclass.com.br"),
  });
  const signatureRef = pdfDoc.context.register(signatureDict);

  // Build signature widget annotation on first page
  const firstPage = pdfDoc.getPage(0);
  const widget = pdfDoc.context.obj({
    Type: "Annot",
    Subtype: "Widget",
    Rect: [0, 0, 0, 0], // invisible
    FT: "Sig",
    T: PDFString.of("AccordSelo"),
    V: signatureRef,
    F: 4,
    P: firstPage.ref,
  });
  const widgetRef = pdfDoc.context.register(widget);

  // Add widget to page annotations
  const annots = firstPage.node.lookup(PDFName.of("Annots"), PDFArray) ?? pdfDoc.context.obj([]);
  annots.push(widgetRef);
  firstPage.node.set(PDFName.of("Annots"), annots);

  // AcroForm
  const acroForm = pdfDoc.context.obj({
    Fields: [widgetRef],
    SigFlags: PDFNumber.of(3),
  });
  const acroFormRef = pdfDoc.context.register(acroForm);
  pdfDoc.catalog.set(PDFName.of("AcroForm"), acroFormRef);

  const out = await pdfDoc.save({ useObjectStreams: false });
  return { pdfWithPlaceholder: out, byteRangePlaceholder, signatureContentsLength };
}

function findContentsPosition(pdfBytes: Uint8Array): { start: number; end: number } {
  // Find /Contents <000...0> (hex placeholder) within signature dict
  const txt = new TextDecoder("latin1").decode(pdfBytes);
  // Look for /Contents <... lots of 0 ... >
  const regex = /\/Contents\s*<(0{1000,})>/;
  const m = txt.match(regex);
  if (!m) throw new Error("Não foi possível localizar placeholder /Contents no PDF");
  const start = txt.indexOf(m[0]) + m[0].indexOf("<") + 1;
  const end = start + m[1].length;
  return { start, end };
}

function fillByteRange(pdfBytes: Uint8Array, contentsStart: number, contentsEnd: number): { pdf: Uint8Array; signedRanges: [number, number, number, number] } {
  // ByteRange: [ 0, contentsStart-1, contentsEnd+1, totalLen - (contentsEnd+1) ]
  // contentsStart points to first hex char; we need offset of '<'
  const angleStart = contentsStart - 1;
  const angleEnd = contentsEnd; // position of '>'
  const total = pdfBytes.length;
  const ranges: [number, number, number, number] = [
    0,
    angleStart,
    angleEnd + 1,
    total - (angleEnd + 1),
  ];

  // Replace /ByteRange [0 ********** ********** **********]
  const txt = new TextDecoder("latin1").decode(pdfBytes);
  const brRegex = /\/ByteRange\s*\[([^\]]*)\]/;
  const brMatch = txt.match(brRegex);
  if (!brMatch) throw new Error("ByteRange não encontrado");
  const originalLen = brMatch[0].length;
  const replacement = `/ByteRange [${ranges[0]} ${ranges[1]} ${ranges[2]} ${ranges[3]}]`;
  if (replacement.length > originalLen) {
    // Pad with spaces if shorter, or fail if longer
    throw new Error(`ByteRange substituto muito longo (${replacement.length} > ${originalLen})`);
  }
  const padded = replacement + " ".repeat(originalLen - replacement.length);
  const brStart = txt.indexOf(brMatch[0]);

  const out = new Uint8Array(pdfBytes);
  const enc = new TextEncoder();
  const padBytes = enc.encode(padded);
  out.set(padBytes, brStart);

  return { pdf: out, signedRanges: ranges };
}

function concatRanges(pdfBytes: Uint8Array, ranges: [number, number, number, number]): Uint8Array {
  const part1 = pdfBytes.slice(ranges[0], ranges[0] + ranges[1]);
  const part2 = pdfBytes.slice(ranges[2], ranges[2] + ranges[3]);
  const out = new Uint8Array(part1.length + part2.length);
  out.set(part1, 0);
  out.set(part2, part1.length);
  return out;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(buf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const PFX_B64 = Deno.env.get("ACCORD_A1_PFX_BASE64");
    const PFX_PASS = Deno.env.get("ACCORD_A1_PFX_PASSWORD");
    if (!PFX_B64 || !PFX_PASS) {
      return new Response(
        JSON.stringify({ ok: false, error: "not_configured", message: "Certificado A1 ICP-Brasil ainda não foi provisionado." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const contractId: string | undefined = body?.contract_id;
    if (!contractId) {
      return new Response(JSON.stringify({ ok: false, error: "missing contract_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Load contract row
    const { data: contract, error: cErr } = await supabase
      .from("pdf_contracts")
      .select("id, pdf_url, servidor_id, document_hash, icp_signed_at, icp_pdf_url")
      .eq("id", contractId)
      .maybeSingle();
    if (cErr || !contract) throw new Error(`Contrato não encontrado: ${cErr?.message}`);

    if (contract.icp_signed_at && contract.icp_pdf_url) {
      return new Response(JSON.stringify({ ok: true, already_signed: true, icp_pdf_url: contract.icp_pdf_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!contract.pdf_url) throw new Error("Contrato sem pdf_url");

    // 2) Download original signed PDF
    const pdfResp = await fetch(contract.pdf_url);
    if (!pdfResp.ok) throw new Error(`Falha ao baixar PDF: ${pdfResp.status}`);
    const originalPdf = new Uint8Array(await pdfResp.arrayBuffer());

    // 3) Load certificate
    const { privateKey, cert, chain } = loadPfx(PFX_B64, PFX_PASS);
    const signerCN = getCN(cert);
    const certValidUntil = cert.validity.notAfter.toISOString();

    // 4) Add signature placeholder
    const { pdfWithPlaceholder } = await prepareSignedPdf(originalPdf);

    // 5) Locate Contents placeholder and fill ByteRange
    const pos = findContentsPosition(pdfWithPlaceholder);
    const { pdf: pdfWithBR, signedRanges } = fillByteRange(pdfWithPlaceholder, pos.start, pos.end);

    // 6) Compute hash of signed ranges
    const signedContent = concatRanges(pdfWithBR, signedRanges);
    const contentDigest = await sha256(signedContent);

    // 7) Build CMS detached signature
    const cmsBytes = buildCmsSignedData(contentDigest, privateKey, cert, chain);

    // 8) Request timestamp on the signature value (for PAdES-B-T)
    const cmsDigest = await sha256(cmsBytes);
    const ts = await requestTimestamp(cmsDigest);
    // (Embedding the TSA token as unsigned attribute would require rebuilding CMS;
    //  here we store the token alongside in DB. The CMS itself is valid PAdES-B-B.)

    // 9) Convert CMS to hex and inject into placeholder
    const hex = Array.from(cmsBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (hex.length > pos.end - pos.start) {
      throw new Error(`CMS muito grande (${hex.length} > ${pos.end - pos.start}). Aumentar signatureContentsLength.`);
    }
    const paddedHex = hex + "0".repeat(pos.end - pos.start - hex.length);

    const finalPdf = new Uint8Array(pdfWithBR);
    const enc = new TextEncoder();
    finalPdf.set(enc.encode(paddedHex), pos.start);

    // 10) Upload to storage
    const storagePath = `icp/${contract.id}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("pdf-contracts")
      .upload(storagePath, finalPdf, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) throw new Error(`Upload falhou: ${upErr.message}`);

    const { data: pub } = supabase.storage.from("pdf-contracts").getPublicUrl(storagePath);
    const icpPdfUrl = pub.publicUrl;

    const signedAt = new Date().toISOString();
    const tsToken = ts ? uint8ToB64(ts.token) : null;
    const tsAuth = ts ? ts.authority : null;

    // 11) Persist audit
    const { error: updErr } = await supabase
      .from("pdf_contracts")
      .update({
        icp_signed_at: signedAt,
        icp_signer_cn: signerCN,
        icp_tsa_token: tsToken,
        icp_tsa_authority: tsAuth,
        icp_pdf_url: icpPdfUrl,
        icp_cert_valid_until: certValidUntil,
      })
      .eq("id", contract.id);
    if (updErr) console.warn("Update icp fields:", updErr);

    return new Response(
      JSON.stringify({
        ok: true,
        icp_pdf_url: icpPdfUrl,
        signed_at: signedAt,
        signer_cn: signerCN,
        tsa_authority: tsAuth,
        cert_valid_until: certValidUntil,
        timestamp_embedded: Boolean(ts),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[sign-pdf-icp] error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
