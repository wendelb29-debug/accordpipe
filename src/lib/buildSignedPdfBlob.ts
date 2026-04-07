import { supabase } from "@/integrations/supabase/client";
import { generateSignedContractPdf } from "@/lib/generateSignedContractPdf";
import type { PdfContract, PdfContractSigner } from "@/hooks/usePdfContracts";

type ContractForSignedPdf = Pick<
  PdfContract,
  "id" | "pdf_url" | "servidor_id" | "document_hash" | "validation_code"
>;

type SignerForSignedPdf = Pick<
  PdfContractSigner,
  "id" | "name" | "email" | "cpf_cnpj" | "signed_at" | "signer_ip" | "signature_photo_url"
>;

interface BuildSignedPdfBlobParams {
  contract: ContractForSignedPdf;
  signers: SignerForSignedPdf[];
  companyName: string;
  code?: string;
  validationUrl?: string;
}

export async function buildSignedPdfBlob({ contract, signers, companyName, code, validationUrl }: BuildSignedPdfBlobParams) {
  const { data: sigFields } = await supabase
    .from("pdf_contract_fields")
    .select("page, pos_x, pos_y, width, height, signer_id")
    .eq("contract_id", contract.id)
    .eq("field_type", "signature");

  let signaturePositions = (sigFields || []).map((field: any) => ({
    page: field.page,
    x: field.pos_x,
    y: field.pos_y,
    width: field.width,
    height: field.height,
    signerId: field.signer_id,
  }));

  if (signaturePositions.length === 0 && contract.servidor_id) {
    const { data: templates } = await supabase
      .from("company_contract_templates")
      .select("id")
      .eq("company_id", contract.servidor_id)
      .limit(1);

    if (templates?.[0]) {
      const { data: templateFields } = await supabase
        .from("company_contract_template_fields")
        .select("page, pos_x, pos_y, width, height")
        .eq("template_id", templates[0].id)
        .eq("field_type", "assinatura");

      signaturePositions = (templateFields || []).map((field: any) => ({
        page: field.page,
        x: field.pos_x,
        y: field.pos_y,
        width: field.width,
        height: field.height,
        signerId: null,
      }));
    }
  }

  return generateSignedContractPdf({
    pdfUrl: contract.pdf_url,
    code: code || `PDF-${contract.id.slice(0, 8).toUpperCase()}`,
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
    validationUrl: validationUrl || `${window.location.origin}/validar-documento/${contract.validation_code || ""}`,
    signaturePositions,
  });
}