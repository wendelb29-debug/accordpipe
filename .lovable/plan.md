
# Plano: Selo ICP-Brasil nos contratos (A1 da Accord + Timestamp)

## O que vai acontecer
Hoje, quando todos os signatários assinam um contrato no Accord, geramos um PDF com foto, IP, hash e código de validação. O plano adiciona **uma etapa final automática**: o PDF é selado com o **certificado A1 da Accord (PAdES-B-T)** e um **carimbo do tempo (RFC 3161) de uma TSA ICP-Brasil**.

Resultado: qualquer leitor PDF (Adobe Reader, gov.br validador) abre o documento e mostra:
- "Assinado por: ACCORD ... (certificado ICP-Brasil)"
- "Carimbo do tempo: AC TSA — [data/hora oficial]"
- Status: **válido**, íntegro, com data confiável

Importante (transparência jurídica): isso é **assinatura da plataforma** atestando integridade + data oficial. As assinaturas dos signatários continuam sendo **avançadas** (não qualificadas individuais). Para presunção contra terceiros das partes, cada signatário precisaria de certificado próprio — fica como evolução futura.

---

## Etapas

### 1. Provisionar certificado A1 e TSA
- Você adquire um **certificado A1 PJ ICP-Brasil** em nome da Accord (Soluti / Serasa / Certisign — ~R$ 250–400/ano, arquivo .pfx + senha).
- Eu provisiono dois secrets no Lovable Cloud:
  - `ACCORD_A1_PFX_BASE64` (conteúdo do .pfx em base64)
  - `ACCORD_A1_PFX_PASSWORD`
- TSA ICP-Brasil gratuita: usaremos `https://timestamp.iti.gov.br` (oficial do ITI) com fallback Serasa.

### 2. Edge function `sign-pdf-icp`
Nova função Deno que recebe um `contract_id`, baixa o PDF assinado do storage, aplica selo PAdES-B-T usando `@signpdf/signpdf` + `@signpdf/signer-p12` + carimbo do tempo via `node-forge`/`pkijs`, e devolve o PDF selado.

### 3. Hook automático no fluxo de assinatura
Em `buildSignedPdfBlob` (após o último signatário): chamar `sign-pdf-icp` e salvar o PDF selado como versão final no bucket. Mantém o original como backup.

### 4. Coluna de auditoria
Migração: adicionar em `pdf_contracts`:
- `icp_signed_at` (timestamptz)
- `icp_signer_cn` (text) — CN do certificado usado
- `icp_tsa_token` (text) — token RFC 3161 retornado
- `icp_pdf_url` (text) — URL do PDF selado

### 5. UI
- Em `PdfContractViewDialog` e `ValidarDocumento`: badge "ICP-Brasil ✓ Selado em [data] por AC Soluti" quando `icp_signed_at` existir.
- Na página `/validar-documento/:code`: link "Baixar PDF ICP" + instruções de validação no Adobe/gov.br.

### 6. Landing
Atualizar o badge atual em `Auth.tsx`: trocar "Assinatura Digital ICP-Brasil" por **"Selo ICP-Brasil + Carimbo do Tempo"** (descrição honesta do que entregamos).

---

## Detalhes técnicos

**Lib**: `@signpdf/signpdf@^3` + `@signpdf/signer-p12@^3` + `@signpdf/placeholder-plain` (compatível com Deno via npm:).

**Fluxo PAdES-B-T**:
1. `pdf-lib` insere placeholder de assinatura no PDF
2. `signer-p12` assina o ByteRange com o A1
3. Envia hash da CMS pra TSA ITI → recebe token RFC 3161
4. Embed do token como unsigned attribute (LTV-ready)
5. Salva PDF resultante no bucket `pdf-contracts/icp/`

**Rotação**: A1 vence em 1 ano. Adicionar alerta no painel admin 30 dias antes do vencimento (consulta `icp_signer_cn` validade).

**Custo**: certificado A1 ~R$ 300/ano. TSA ITI gratuita. Sem custo por documento.

---

## O que você precisa fazer
1. Comprar o A1 PJ da Accord (recomendo **Soluti** ou **Certisign**, emissão online em ~1h)
2. Me enviar o `.pfx` + senha quando estiver pronto (via secrets, não cole no chat)
3. Aprovar este plano pra eu começar pela infra (migration + edge function) usando um certificado de teste enquanto o real não chega

Posso começar pelas partes 2, 4, 5 e 6 já — o certificado real só é necessário pra ativar em produção.
