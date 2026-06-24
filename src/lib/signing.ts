/**
 * Helper único para o link de assinatura no fluxo de documentos
 * (generated_documents / document_signers / rota /assinar-documento).
 *
 * NÃO use isso para o fluxo de contratos PDF (rota /assinar com signing_token
 * ou /assinar-pdf) — aquele é outra feature.
 */
export const getDocumentSigningLink = (authToken: string) =>
  `${window.location.origin}/assinar-documento/${authToken}`;
