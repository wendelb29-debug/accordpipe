import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SignaturePosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signerId?: string | null;
}

interface SignedSignerData {
  id?: string;
  name: string;
  role: string;
  email?: string | null;
  document?: string | null;
  signed_at?: string | null;
  ip?: string | null;
  signature_photo_url?: string | null;
}

interface PersistedPdfContract {
  id: string;
  pdf_url: string;
  servidor_id: string;
  name: string;
  document_hash: string | null;
  validation_code: string | null;
}

interface PersistedPdfSigner {
  id: string;
  name: string;
  email: string | null;
  cpf_cnpj: string | null;
  sign_order: number;
  status: string;
  signed_at: string | null;
  signer_ip: string | null;
  signature_photo_url: string | null;
}

async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

function splitText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current += ` ${word}`;
    }
  }

  if (current.trim()) lines.push(current.trim());
  return lines;
}

async function fetchBinary(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao buscar arquivo: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function resolveSignaturePositions(supabase: ReturnType<typeof createClient>, contractId: string, servidorId: string) {
  const { data: sigFields, error: sigFieldsError } = await supabase
    .from("pdf_contract_fields")
    .select("page, pos_x, pos_y, width, height, signer_id")
    .eq("contract_id", contractId)
    .in("field_type", ["signature", "assinatura"]);

  if (sigFieldsError) throw sigFieldsError;

  let positions: SignaturePosition[] = (sigFields || []).map((field: any) => ({
    page: field.page,
    x: field.pos_x,
    y: field.pos_y,
    width: field.width,
    height: field.height,
    signerId: field.signer_id,
  }));

  if (positions.length === 0 && servidorId) {
    const { data: templates, error: templateError } = await supabase
      .from("company_contract_templates")
      .select("id")
      .eq("company_id", servidorId)
      .limit(1);

    if (templateError) throw templateError;

    if (templates?.[0]) {
      const { data: templateFields, error: templateFieldsError } = await supabase
        .from("company_contract_template_fields")
        .select("page, pos_x, pos_y, width, height")
        .eq("template_id", templates[0].id)
        .in("field_type", ["assinatura", "signature"]);

      if (templateFieldsError) throw templateFieldsError;

      const SCALE = 1.2;
      positions = (templateFields || []).map((field: any) => ({
        page: field.page,
        x: field.pos_x * SCALE,
        y: field.pos_y * SCALE,
        width: field.width * SCALE,
        height: field.height * SCALE,
        signerId: null,
      }));
    }
  }

  return positions.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
}

function buildSignedPdfPublicUrl(path: string) {
  const baseUrl = Deno.env.get("SUPABASE_URL")!;
  return `${baseUrl}/storage/v1/object/public/contract-pdfs/${path}`;
}

async function buildSignedPdfBytes(data: {
  pdfUrl: string;
  code: string;
  companyName: string;
  documentHash: string;
  validationCode: string;
  signedAt: string;
  signers: SignedSignerData[];
  validationUrl: string;
  signaturePositions?: SignaturePosition[];
}) {
  const pdfBytes = await fetchBinary(data.pdfUrl);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  const signerPhotos: (Uint8Array | null)[] = [];
  for (const signer of data.signers) {
    if (!signer.signature_photo_url) {
      signerPhotos.push(null);
      continue;
    }

    try {
      signerPhotos.push(await fetchBinary(signer.signature_photo_url));
    } catch {
      signerPhotos.push(null);
    }
  }

  let positions = [...(data.signaturePositions || [])];
  const signedSigners = data.signers.filter((signer) => Boolean(signer.signed_at));

  const PDF_SCALE = 1.2;
  if (positions.length === 0 && signedSigners.length > 0) {
    const lastPage = pages.length;
    const stampW = 280;
    const stampH = 90;
    const gap = 12;
    const { height: lastPageHeight } = pages[lastPage - 1].getSize();
    const startY = lastPageHeight - 120;
    positions = signedSigners.map((_, idx) => ({
      page: lastPage,
      x: 40 * PDF_SCALE,
      y: (lastPageHeight - startY + (stampH + gap) * idx) * PDF_SCALE,
      width: stampW * PDF_SCALE,
      height: stampH * PDF_SCALE,
      signerId: null,
    }));
  }

  const usedSignerIds = new Set<string>();

  for (const pos of positions) {
    const signer = pos.signerId
      ? signedSigners.find((candidate) => candidate.id === pos.signerId)
      : signedSigners.find((candidate) => !candidate.id || !usedSignerIds.has(candidate.id));

    if (!signer || !signer.signed_at) continue;
    if (signer.id) usedSignerIds.add(signer.id);

    const signerIndex = data.signers.findIndex((candidate) => candidate.id === signer.id);
    const pageIdx = pos.page - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;

    const page = pages[pageIdx];
    const { height: pageHeight } = page.getSize();
    const scale = 1.2;
    const pdfX = pos.x / scale;
    const pdfY = pageHeight - pos.y / scale - pos.height / scale;
    const stampW = pos.width / scale;
    const stampH = pos.height / scale;

    page.drawRectangle({
      x: pdfX,
      y: pdfY,
      width: stampW,
      height: stampH,
      color: rgb(0.96, 0.97, 1),
      borderColor: rgb(0.12, 0.25, 0.69),
      borderWidth: 0.5,
    });

    let textOffsetX = 5;
    const photoData = signerIndex >= 0 ? signerPhotos[signerIndex] : null;
    if (photoData) {
      try {
        let image;
        try {
          image = await pdfDoc.embedJpg(photoData);
        } catch {
          image = await pdfDoc.embedPng(photoData);
        }

        const photoSize = Math.min(stampH - 6, 70);
        page.drawImage(image, {
          x: pdfX + 3,
          y: pdfY + (stampH - photoSize) / 2,
          width: photoSize,
          height: photoSize,
        });
        textOffsetX = photoSize + 8;
      } catch {
        // ignore invalid image payloads
      }
    }

    const textX = pdfX + textOffsetX;
    const lineH = 10;
    let ty = pdfY + stampH - 12;

    page.drawText("Assinado Digitalmente", {
      x: textX,
      y: ty,
      size: 8,
      font: fontBold,
      color: rgb(0.12, 0.25, 0.69),
    });
    ty -= lineH;

    page.drawText(`Nome: ${signer.name}`, {
      x: textX,
      y: ty,
      size: 7,
      font,
      color: rgb(0, 0, 0),
    });
    ty -= lineH;

    if (signer.document) {
      page.drawText(`CPF/CNPJ: ${signer.document}`, {
        x: textX,
        y: ty,
        size: 7,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      ty -= lineH;
    }

    const signedDateText = new Date(signer.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    page.drawText(`Data: ${signedDateText}`, {
      x: textX,
      y: ty,
      size: 7,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    ty -= lineH;

    if (signer.ip) {
      page.drawText(`IP: ${signer.ip}`, {
        x: textX,
        y: ty,
        size: 6,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  const proofPage = pdfDoc.addPage();
  const { width: pw, height: ph } = proofPage.getSize();
  let y = ph - 40;

  proofPage.drawText("Comprovante de Assinatura Digital", {
    x: pw / 2 - 80,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.25, 0.69),
  });
  y -= 12;

  proofPage.drawText("Documento assinado digitalmente com validade jurídica", {
    x: pw / 2 - 100,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 20;

  proofPage.drawText("Validade Jurídica", {
    x: 30,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.12, 0.25, 0.69),
  });
  y -= 12;

  const legalText = "Documento assinado digitalmente com validade jurídica, conforme a Medida Provisória nº 2.200-2/2001. A assinatura digital garante a autenticidade, integridade e não-repúdio do documento.";
  const legalLines = splitText(legalText, 90);
  for (const line of legalLines) {
    proofPage.drawText(line, { x: 30, y, size: 9, font, color: rgb(0, 0, 0) });
    y -= 11;
  }
  y -= 8;

  proofPage.drawText("Carimbo do Tempo", {
    x: 30,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.12, 0.25, 0.69),
  });
  y -= 12;

  const signedDate = new Date(data.signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  proofPage.drawText(`Data e hora: ${signedDate}`, { x: 30, y, size: 9, font, color: rgb(0, 0, 0) });
  y -= 11;
  proofPage.drawText("Fuso horário: GMT -03:00 (Brasília)", { x: 30, y, size: 9, font, color: rgb(0, 0, 0) });
  y -= 16;

  proofPage.drawText("Verificação de Autenticidade", {
    x: 30,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.12, 0.25, 0.69),
  });
  y -= 12;
  proofPage.drawText(`Código de validação: ${data.validationCode}`, { x: 30, y, size: 9, font, color: rgb(0, 0, 0) });
  y -= 11;

  if (data.documentHash) {
    proofPage.drawText(`Hash SHA-256: ${data.documentHash}`, { x: 30, y, size: 7, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 10;
  }

  proofPage.drawText(`Link de validação: ${data.validationUrl}`, { x: 30, y, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
  y -= 20;

  proofPage.drawText("Assinaturas", {
    x: pw / 2 - 25,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.12, 0.25, 0.69),
  });
  y -= 14;

  for (const signer of data.signers) {
    proofPage.drawRectangle({
      x: 25,
      y: y - 35,
      width: pw - 50,
      height: 45,
      color: rgb(0.98, 0.98, 1),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
    });

    proofPage.drawText(`${signer.name} (${signer.role})`, { x: 30, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
    y -= 10;
    if (signer.email) {
      proofPage.drawText(`E-mail: ${signer.email}`, { x: 30, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 9;
    }
    if (signer.document) {
      proofPage.drawText(`CPF/CNPJ: ${signer.document}`, { x: 30, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 9;
    }
    if (signer.signed_at) {
      const signerSignedAt = new Date(signer.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      proofPage.drawText(`Assinou em: ${signerSignedAt}`, { x: 30, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 9;
    }
    if (signer.ip) {
      proofPage.drawText(`IP: ${signer.ip}`, { x: 30, y, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 9;
    }
    proofPage.drawText(`Emitido por ${data.companyName}`, { x: 30, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
    y -= 16;
  }

  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPages()[i];
    const { width } = page.getSize();
    page.drawText(`${data.code} - Página ${i + 1} de ${totalPages} | Validação: ${data.validationCode}`, {
      x: width / 2 - 80,
      y: 10,
      size: 6,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  return await pdfDoc.save();
}

async function persistSignedPdfForPdfContract(
  supabase: ReturnType<typeof createClient>,
  contract: PersistedPdfContract,
  signers: PersistedPdfSigner[],
  origin: string,
) {
  const signaturePositions = await resolveSignaturePositions(supabase, contract.id, contract.servidor_id);

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("nome_fantasia, razao_social")
    .eq("id", contract.servidor_id)
    .maybeSingle();

  if (companyError) throw companyError;

  const companyName = company?.nome_fantasia || company?.razao_social || "Empresa";
  const pdfBytes = await buildSignedPdfBytes({
    pdfUrl: contract.pdf_url,
    code: `PDF-${contract.id.slice(0, 8).toUpperCase()}`,
    companyName,
    documentHash: contract.document_hash || "",
    validationCode: contract.validation_code || "",
    signedAt: signers.find((signer) => signer.signed_at)?.signed_at || new Date().toISOString(),
    signers: signers.map((signer) => ({
      id: signer.id,
      name: signer.name,
      role: "signatário",
      email: signer.email,
      document: signer.cpf_cnpj,
      signed_at: signer.signed_at,
      ip: signer.signer_ip,
      signature_photo_url: signer.signature_photo_url,
    })),
    validationUrl: `${origin}/validar-documento/${contract.validation_code || ""}`,
    signaturePositions,
  });

  const signedPath = `${contract.servidor_id}/${contract.id}/contrato_assinado.pdf`;
  await supabase.storage.from("contract-pdfs").remove([signedPath]);
  const { error: uploadSignedError } = await supabase.storage
    .from("contract-pdfs")
    .upload(signedPath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadSignedError) throw uploadSignedError;

  const signedPublicUrl = buildSignedPdfPublicUrl(signedPath);
  const cacheBustedUrl = `${signedPublicUrl}?v=${Date.now()}`;
  const { error: updatePdfUrlError } = await supabase
    .from("pdf_contracts")
    .update({
      pdf_assinado_url: cacheBustedUrl,
      pdf_assinado_path: signedPath,
    })
    .eq("id", contract.id);

  if (updatePdfUrlError) throw updatePdfUrlError;

  return {
    url: cacheBustedUrl,
    path: signedPath,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;
    const photo = formData.get("photo") as File;
    const latitude = parseFloat(formData.get("latitude") as string);
    const longitude = parseFloat(formData.get("longitude") as string);
    const address = formData.get("address") as string;
    const signerName = formData.get("signer_name") as string | null;
    const signerDocument = formData.get("signer_document") as string | null;

    if (!token || !photo || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!photo.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "Invalid file type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (photo.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const clientIp = getClientIp(req);
    const signedAt = new Date().toISOString();
    const origin = req.headers.get("origin") || new URL(req.url).origin;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sigRecord } = await supabase
      .from("contract_signatures")
      .select("id, contract_id, signer_role, signed_at")
      .eq("signing_token", token)
      .maybeSingle();

    if (sigRecord) {
      if (sigRecord.signed_at) {
        return new Response(
          JSON.stringify({ error: "This signature has already been completed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const contractId = sigRecord.contract_id;
      const fileName = `${contractId}_${sigRecord.signer_role}_${Date.now()}.jpg`;
      const arrayBuffer = await photo.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(fileName, arrayBuffer, { contentType: photo.type });

      if (uploadErr) {
        return new Response(
          JSON.stringify({ error: "Failed to upload photo" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);
      const signatureHash = await generateHash(
        `${contractId}|${signerName || ""}|${signerDocument || ""}|${signedAt}|${clientIp}`,
      );

      const { error: updateErr } = await supabase
        .from("contract_signatures")
        .update({
          signed_at: signedAt,
          signature_photo_url: urlData.publicUrl,
          signature_latitude: latitude,
          signature_longitude: longitude,
          signature_address: address,
          signer_name: signerName || null,
          signer_document: signerDocument || null,
          signer_ip: clientIp,
        })
        .eq("id", sigRecord.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update signature" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: allSigs } = await supabase
        .from("contract_signatures")
        .select("signed_at")
        .eq("contract_id", contractId);

      const allSigned = allSigs && allSigs.every((s: any) => s.signed_at !== null);

      if (allSigned) {
        const { data: contractData } = await supabase
          .from("contracts")
          .select("contract_content, code")
          .eq("id", contractId)
          .single();

        const documentHash = await generateHash(
          `${contractId}|${contractData?.contract_content || ""}|${signedAt}`,
        );
        const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

        await supabase
          .from("contracts")
          .update({
            signature_status: "signed",
            signed_at: signedAt,
            document_hash: documentHash,
            validation_code: validationCode,
          })
          .eq("id", contractId);
      }

      return new Response(
        JSON.stringify({ success: true, signature_hash: signatureHash }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: pdfSigner } = await supabase
      .from("pdf_contract_signers")
      .select("id, contract_id, name, cpf_cnpj, status, signed_at")
      .eq("signing_token", token)
      .maybeSingle();

    if (pdfSigner) {
      if (pdfSigner.signed_at || pdfSigner.status === "assinado") {
        return new Response(
          JSON.stringify({ error: "This signature has already been completed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const contractId = pdfSigner.contract_id;
      const fileName = `pdf_signer_${pdfSigner.id}_${Date.now()}.jpg`;
      const arrayBuffer = await photo.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(fileName, arrayBuffer, { contentType: photo.type });

      if (uploadErr) {
        return new Response(
          JSON.stringify({ error: "Failed to upload photo" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);
      const signatureHash = await generateHash(
        `${contractId}|${signerName || pdfSigner.name || ""}|${signerDocument || pdfSigner.cpf_cnpj || ""}|${signedAt}|${clientIp}`,
      );

      const { error: updateErr } = await supabase
        .from("pdf_contract_signers")
        .update({
          status: "assinado",
          signed_at: signedAt,
          signature_photo_url: urlData.publicUrl,
          signature_latitude: latitude,
          signature_longitude: longitude,
          signature_address: address,
          signer_ip: clientIp,
        })
        .eq("id", pdfSigner.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update signer" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabase.from("pdf_contract_history").insert({
        contract_id: contractId,
        action: "assinado",
        description: [
          `Assinatura realizada por: ${signerName || pdfSigner.name || "—"}`,
          (signerDocument || pdfSigner.cpf_cnpj) ? `Documento: ${signerDocument || pdfSigner.cpf_cnpj}` : null,
          `Data: ${new Date(signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
          `IP: ${clientIp}`,
          `Local: ${address || "—"}`,
        ].filter(Boolean).join("\n"),
        created_by_name: signerName || pdfSigner.name || "Agente Externo",
      });

      const { data: allSigners, error: allSignersError } = await supabase
        .from("pdf_contract_signers")
        .select("id, name, email, cpf_cnpj, sign_order, status, signed_at, signer_ip, signature_photo_url")
        .eq("contract_id", contractId)
        .order("sign_order", { ascending: true });

      if (allSignersError) {
        return new Response(
          JSON.stringify({ error: "Failed to load signer list" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const allSigned = allSigners && allSigners.every((s: any) => s.status === "assinado");
      let signedPdfUrl: string | null = null;
      let pdfError: string | null = null;

      if (allSigned) {
        const { data: contractData, error: contractDataError } = await supabase
          .from("pdf_contracts")
          .select("id, pdf_url, servidor_id, name, document_hash, validation_code")
          .eq("id", contractId)
          .single();

        if (contractDataError || !contractData) {
          return new Response(
            JSON.stringify({ error: "Failed to load contract data" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const documentHash = await generateHash(
          `${contractId}|${contractData.pdf_url || contractData.name || ""}|${signedAt}`,
        );
        const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

        const { error: updateContractError } = await supabase
          .from("pdf_contracts")
          .update({
            status: "assinado",
            document_hash: documentHash,
            validation_code: validationCode,
          })
          .eq("id", contractId);

        if (updateContractError) {
          return new Response(
            JSON.stringify({ error: "Failed to update contract status" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        try {
          const persistedPdf = await persistSignedPdfForPdfContract(
            supabase,
            {
              ...(contractData as any),
              document_hash: documentHash,
              validation_code: validationCode,
            },
            (allSigners as PersistedPdfSigner[]) || [],
            origin,
          );
          signedPdfUrl = persistedPdf.url;

          await supabase.from("pdf_contract_history").insert({
            contract_id: contractId,
            action: "concluido",
            description: `Todas as assinaturas foram coletadas e o PDF final foi gerado. Hash: ${documentHash.slice(0, 16)}... Código: ${validationCode}`,
            created_by_name: "Sistema",
          });
        } catch (error) {
          pdfError = error instanceof Error ? error.message : "Falha ao gerar o PDF final";
          await supabase.from("pdf_contract_history").insert({
            contract_id: contractId,
            action: "erro_pdf_assinado",
            description: `As assinaturas foram concluídas, mas houve falha ao gerar o PDF final. Motivo: ${pdfError}`,
            created_by_name: "Sistema",
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          signature_hash: signatureHash,
          photo_url: urlData.publicUrl,
          signed_pdf_url: signedPdfUrl,
          pdf_error: pdfError,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: ccSigner } = await supabase
      .from("client_contract_signers")
      .select("id, contract_id, signer_type, status, signed_at")
      .eq("signing_token", token)
      .maybeSingle();

    if (ccSigner) {
      if (ccSigner.signed_at || ccSigner.status === "assinado") {
        return new Response(
          JSON.stringify({ error: "This signature has already been completed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const contractId = ccSigner.contract_id;
      const fileName = `client_signer_${ccSigner.id}_${Date.now()}.jpg`;
      const arrayBuffer = await photo.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(fileName, arrayBuffer, { contentType: photo.type });

      if (uploadErr) {
        return new Response(
          JSON.stringify({ error: "Failed to upload photo" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);
      const signatureHash = await generateHash(
        `${contractId}|${signerName || ""}|${signerDocument || ""}|${signedAt}|${clientIp}`,
      );

      const { error: updateErr } = await supabase
        .from("client_contract_signers")
        .update({
          status: "assinado",
          signed_at: signedAt,
          signature_photo_url: urlData.publicUrl,
          signature_latitude: latitude,
          signature_longitude: longitude,
          signature_address: address,
          signer_ip: clientIp,
          signer_document: signerDocument || null,
        })
        .eq("id", ccSigner.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update signer" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: allSigners } = await supabase
        .from("client_contract_signers")
        .select("is_required, status")
        .eq("contract_id", contractId);

      const allRequiredSigned = allSigners &&
        allSigners.filter((s: any) => s.is_required).every((s: any) => s.status === "assinado");

      if (allRequiredSigned) {
        const documentHash = await generateHash(`${contractId}|${signedAt}`);
        const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

        await supabase
          .from("client_contracts")
          .update({
            contract_status: "assinado",
            signed_at: signedAt,
            document_hash: documentHash,
            validation_code: validationCode,
          })
          .eq("id", contractId);

        await supabase.from("client_contract_history").insert({
          contract_id: contractId,
          action: "assinatura_completa",
          description: `Todas as assinaturas obrigatórias foram concluídas.\nHash: ${documentHash}\nCódigo: ${validationCode}`,
          created_by_name: "Sistema",
        });
      }

      await supabase.from("client_contract_history").insert({
        contract_id: contractId,
        action: "assinatura",
        description: [
          `Assinatura realizada por: ${signerName || "—"} (${ccSigner.signer_type})`,
          signerDocument ? `Documento: ${signerDocument}` : null,
          `Data: ${new Date(signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
          `IP: ${clientIp}`,
          `Local: ${address || "—"}`,
        ].filter(Boolean).join("\n"),
        created_by_name: signerName || "Agente Externo",
      });

      return new Response(
        JSON.stringify({ success: true, signature_hash: signatureHash }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: clientContract } = await supabase
      .from("client_contracts")
      .select("id, contract_status, client_name, client_cpf, plan_name, monthly_value, servidor_id")
      .eq("signing_token", token)
      .eq("contract_status", "pendente")
      .maybeSingle();

    if (clientContract) {
      const contractId = clientContract.id;
      const fileName = `client_${contractId}_${Date.now()}.jpg`;
      const arrayBuffer = await photo.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(fileName, arrayBuffer, { contentType: photo.type });

      if (uploadErr) {
        return new Response(
          JSON.stringify({ error: "Failed to upload photo" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);
      const documentHash = await generateHash(
        `${contractId}|${clientContract.client_name}|${clientContract.client_cpf || ""}|${signedAt}`,
      );
      const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

      const { error: updateErr } = await supabase
        .from("client_contracts")
        .update({
          contract_status: "assinado",
          signed_at: signedAt,
          signature_photo_url: urlData.publicUrl,
          signature_latitude: latitude,
          signature_longitude: longitude,
          signature_address: address,
          signer_name: signerName || null,
          signer_document: signerDocument || null,
          document_hash: documentHash,
          validation_code: validationCode,
        })
        .eq("id", contractId)
        .eq("contract_status", "pendente");

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update contract" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const historyDescription = [
        `Contrato assinado digitalmente`,
        `Cliente: ${clientContract.client_name || "—"}`,
        clientContract.client_cpf ? `CPF: ${clientContract.client_cpf}` : null,
        clientContract.plan_name ? `Plano: ${clientContract.plan_name}` : null,
        clientContract.monthly_value ? `Valor: R$ ${Number(clientContract.monthly_value).toFixed(2)}` : null,
        `Assinante: ${signerName || "—"}`,
        signerDocument ? `Documento do assinante: ${signerDocument}` : null,
        `Data da assinatura: ${new Date(signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
        `IP: ${clientIp}`,
        `Localização: ${address || "—"}`,
        `Hash do documento: ${documentHash}`,
        `Código de validação: ${validationCode}`,
      ].filter(Boolean).join("\n");

      await supabase.from("client_contract_history").insert({
        contract_id: contractId,
        action: "assinatura",
        description: historyDescription,
        created_by_name: signerName || "Agente Externo",
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: contract, error: fetchErr } = await supabase
      .from("contracts")
      .select("id, signature_status, contract_content")
      .eq("signing_token", token)
      .eq("signature_status", "pending")
      .maybeSingle();

    if (fetchErr || !contract) {
      return new Response(
        JSON.stringify({ error: "Contract not found or already signed" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contractId2 = contract.id;
    const fileName = `${contract.id}_${Date.now()}.jpg`;
    const arrayBuffer = await photo.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from("signatures")
      .upload(fileName, arrayBuffer, { contentType: photo.type });

    if (uploadErr) {
      return new Response(
        JSON.stringify({ error: "Failed to upload photo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);
    const documentHash = await generateHash(
      `${contractId2}|${contract.contract_content || ""}|${signedAt}`,
    );
    const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

    const { error: updateErr } = await supabase
      .from("contracts")
      .update({
        signature_status: "signed",
        signed_at: new Date().toISOString(),
        signature_photo_url: urlData.publicUrl,
        signature_latitude: latitude,
        signature_longitude: longitude,
        signature_address: address,
        signer_name: signerName || null,
        signer_document: signerDocument || null,
        document_hash: documentHash,
        validation_code: validationCode,
      })
      .eq("signing_token", token)
      .eq("signature_status", "pending");

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Failed to update contract" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sign-contract error", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
