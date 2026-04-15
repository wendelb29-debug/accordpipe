import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { CompanyRow } from "./useCompanies";

interface CreateContractOptions {
  autoCreateSigners?: boolean;
}

export interface ContractRow {
  id: string;
  code: string;
  company_id: string;
  contract_type: string;
  signature_status: string;
  signature_type: string | null;
  signature_link: string | null;
  signed_at: string | null;
  link_expires_at: string | null;
  foro: string | null;
  matriz_nome: string | null;
  matriz_cnpj: string | null;
  matriz_endereco: string | null;
  contract_content: string | null;
  signing_token: string | null;
  signature_photo_url: string | null;
  signature_latitude: number | null;
  signature_longitude: number | null;
  signature_address: string | null;
  signer_name: string | null;
  signer_document: string | null;
  created_at: string;
  company?: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string;
    responsavel: string | null;
    endereco: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    complemento: string | null;
    nome_fantasia_display?: string;
  };
}

async function generateDocumentHash(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function useContracts() {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchContracts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contracts")
      .select("*, companies(razao_social, nome_fantasia, cnpj, responsavel, endereco, numero, bairro, cidade, estado, cep, complemento)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar contratos");
      console.error(error);
    } else {
      setContracts(
        (data || []).map((c: any) => ({
          ...c,
          company: c.companies,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchContracts();
  }, [user]);

  const generateContractContent = (company: CompanyRow, foro: string, matrizNome: string) => {
    const addressParts = [
      company.endereco,
      company.numero && `nº ${company.numero}`,
      company.complemento,
      company.bairro,
      company.cidade && company.estado && `${company.cidade}/${company.estado}`,
      company.cep && `CEP: ${company.cep}`,
    ].filter(Boolean).join(", ");

    const currentDate = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    return `CONTRATO DE PARCERIA COMERCIAL – REVENDEDOR AUTORIZADO

Pelo presente instrumento particular, de um lado ${matrizNome}, pessoa jurídica de direito privado, inscrita no CNPJ sob nº [CNPJ MATRIZ], com sede em [ENDEREÇO MATRIZ], doravante denominada MATRIZ; e, de outro lado, ${company.razao_social}${company.nome_fantasia ? `, nome fantasia ${company.nome_fantasia},` : ""} inscrito no CNPJ sob nº ${company.cnpj}, com endereço em ${addressParts || "[ENDEREÇO NÃO INFORMADO]"}, neste ato representada por ${company.responsavel || "[RESPONSÁVEL]"}, doravante denominado REVENDEDOR AUTORIZADO, resolvem celebrar o presente Contrato de Parceria Comercial, que se regerá pelas cláusulas e condições abaixo.

CLÁUSULA 1 – DO OBJETO
1.1. O presente contrato tem por objeto a parceria comercial para captação, indicação e gestão comercial de associados de proteção veicular, sendo toda a operação administrativa, jurídica, financeira e de sinistros de responsabilidade exclusiva da MATRIZ.
1.2. O REVENDEDOR ATUARÁ como Revendedor Autorizado, sem qualquer vínculo societário, empregatício ou de franquia com a MATRIZ.

CLÁUSULA 2 – DO MODELO OPERACIONAL
2.1. O REVENDEDOR AUTORIZADO será responsável por:
• Prospecção e fechamento de associados;
• Envio correto dos dados à MATRIZ;
• Cobrança ativa dos boletos junto aos associados;
• Atendimento comercial primário aos associados de sua carteira.
2.2. A MATRIZ será responsável por:
• Sistema de gestão;
• Elaboração e guarda dos contratos;
• Emissão de boletos;
• Gestão de sinistros, nos termos deste contrato;
• Jurídico e regulamentos;
• Conformidade com a LGPD.
2.3. O atendimento ao associado será realizado prioritariamente pelo REVENDEDOR AUTORIZADO, contando com suporte operacional, jurídico e administrativo da MATRIZ, conforme limites definidos neste contrato.

4.3. Somente gerarão comissão veículos:
• Ativos;
• Adimplentes;
• Sem solicitação de cancelamento.

CLÁUSULA 5 – DO BÔNUS DE PERFORMANCE
5.1. Será concedido ao REVENDEDOR um bônus adicional de 2% (dois por cento), totalizando 12% de comissão, nos trimestres em que sua carteira mantiver índice mínimo de 90% (noventa por cento) de adimplência.
5.2. O bônus:
• Não é direito adquirido;
• É condicionado à performance;
• Pode ser suspenso a qualquer tempo se o índice mínimo não for mantido.

CLÁUSULA 6 – DA TAXA DE ADESÃO
6.1. A taxa de adesão cobrada do associado pertence integralmente ao REVENDEDOR AUTORIZADO.
6.2. A taxa de adesão:
• Não integra o serviço de proteção veicular;
• Não gera direito futuro ao associado;
• Não pode ser utilizada como desconto de mensalidade;
• Não interfere nos valores tabelados pela MATRIZ.

CLÁUSULA 6-A – DA TAXA DE IMPLANTAÇÃO DO REVENDEDOR
6-A.1. No ato da formalização desta parceria, o REVENDEDOR pagará à MATRIZ uma taxa única de implantação no valor de R$ 497,00 (quatrocentos e noventa e sete reais).
6-A.2. A taxa de implantação refere-se a:
• Liberação de acesso ao sistema;
• Configuração operacional;
• Parametrização de contratos;
• Treinamento inicial;
• Ativação do REVENDEDOR como Revendedor Autorizado.
6-A.3. A taxa de implantação:
• Não é reembolsável;
• Não gera crédito futuro;
• Não se confunde com mensalidade ou comissão;
• Não caracteriza taxa de franquia.

CLÁUSULA 7 – DO ATENDIMENTO, INADIMPLÊNCIA E CANCELAMENTO
7.1. A gestão de inadimplência e solicitações de cancelamento será de responsabilidade do REVENDEDOR AUTORIZADO.
7.2. O REVENDEDOR deverá acionar o suporte da MATRIZ para efetivação de cancelamentos, mediante solicitação formal e documentada.
7.3. O contato direto do associado com a MATRIZ será restrito e somente permitido nas seguintes hipóteses:
• Após 6 (seis) meses, caso haja quebra contratual entre a MATRIZ e o REVENDEDOR;
• Em procedimentos de sinistro exclusivamente nos casos de indenização;
• Em comunicações obrigatórias de alteração contratual decorrentes de rateio.
7.4. As comunicações de alteração contratual por rateio serão realizadas pela MATRIZ por meio de canais oficiais de comunicação que não possuam opção de exclusão, garantindo base legal, registro e prova de notificação ao associado.
7.5. Todos os demais atendimentos relacionados a sinistros que não envolvam indenização serão tratados pelo suporte do REVENDEDOR, com apoio técnico da MATRIZ.
7.6. É vedado ao associado manter contato direto e recorrente com a MATRIZ fora das hipóteses previstas nesta cláusula.

CLÁUSULA 8 – DO USO DA MARCA
8.1. O uso da marca da MATRIZ pelo REVENDEDOR será permitido apenas durante a vigência deste contrato e conforme diretrizes estabelecidas.
8.2. É vedado o uso da marca após o encerramento do contrato.

CLÁUSULA 9 – DA LGPD E CONFIDENCIALIDADE
9.1. As partes comprometem-se a cumprir integralmente a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
9.2. Todas as informações trocadas são confidenciais.

CLÁUSULA 10 – DA RESCISÃO
10.1. O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 (trinta) dias.
10.2. Em caso de descumprimento contratual, a rescisão poderá ser imediata.

CLÁUSULA 11 – DA BASE DE ASSOCIADOS E QUEBRA CONTRATUAL
11.1. A base de associados formada durante a vigência deste contrato será considerada de titularidade compartilhada, sendo 50% (cinquenta por cento) da MATRIZ e 50% (cinquenta por cento) do REVENDEDOR.
11.2. Em caso de rescisão contratual, por qualquer motivo, a divisão da base seguirá o percentual previsto no item 11.1, sendo vedado o desvio integral da carteira por qualquer das partes.
11.3. A MATRIZ somente poderá estabelecer contato direto com os associados após 6 (seis) meses da quebra contratual, respeitados os limites legais e contratuais.

CLÁUSULA 12 – NÃO CONCORRÊNCIA E NÃO DESVIO DE CARTEIRA
12.1. Durante a vigência deste contrato e pelo prazo de 12 (doze) meses após seu encerramento, o REVENDEDOR compromete-se a não atuar, direta ou indiretamente, em atividade concorrente à da MATRIZ, utilizando-se de informações, base de dados, know-how ou estrutura operacional obtidas em razão desta parceria.
12.2. É expressamente proibido ao REVENDEDOR:
• Criar carteira paralela de associados fora da MATRIZ;
• Redirecionar associados para outra associação, seguradora ou produto similar;
• Utilizar dados dos associados para fins diversos deste contrato.
12.3. O descumprimento desta cláusula acarretará multa não compensatória no valor equivalente a 12 (doze) mensalidades médias por veículo desviado, considerando o ticket médio de R$ 170,00 (cento e setenta reais), sem prejuízo de perdas e danos.

CLÁUSULA 12 – PENALIDADES
12.1. O descumprimento de quaisquer obrigações previstas neste contrato sujeitará o REVENDEDOR às seguintes penalidades, a critério da MATRIZ:
• Advertência formal;
• Suspensão temporária das comissões;
• Rescisão imediata do contrato;
• Aplicação de multa contratual.

CLÁUSULA 13 – DISPOSIÇÕES FINAIS
13.1. Este contrato não caracteriza franquia, sociedade, representação comercial exclusiva ou vínculo empregatício entre as partes.
13.2. O foro eleito para dirimir quaisquer controvérsias oriundas deste contrato é o da comarca de ${foro || "[CIDADE/UF]"}, com renúncia a qualquer outro, por mais privilegiado que seja.

E por estarem justas e contratadas, as partes assinam o presente instrumento.

${company.cidade || "[LOCAL]"}, ${currentDate}

MATRIZ
_________________________
${matrizNome}

REVENDEDOR AUTORIZADO
_________________________
${company.razao_social}
${company.responsavel || "[RESPONSÁVEL]"}`;
  };

  const createContract = async (
    companyId: string,
    foro: string,
    matrizNome: string,
    signatureType: string,
    linkValidityDays: number,
    proposalClause?: string,
    leadId?: string,
    options?: CreateContractOptions
  ) => {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      toast.error("Empresa não encontrada");
      return null;
    }

    let content = generateContractContent(company as CompanyRow, foro, matrizNome);

    if (proposalClause) {
      const sigBlock = "\nE por estarem justas e contratadas";
      const idx = content.indexOf(sigBlock);
      if (idx > 0) {
        content = content.slice(0, idx) + "\n\n" + proposalClause + content.slice(idx);
      } else {
        content += "\n\n" + proposalClause;
      }
    }

    const signingToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + linkValidityDays);

    const { data: insertedContract, error } = await supabase.from("contracts").insert({
      code: "TEMP",
      company_id: companyId,
      contract_type: "new",
      signature_type: signatureType,
      foro,
      matriz_nome: matrizNome,
      contract_content: content,
      link_expires_at: expiresAt.toISOString(),
      signing_token: signingToken,
      signature_link: `${window.location.origin}/assinar/${signingToken}`,
      created_by: user?.id,
      lead_id: leadId || null,
    } as any).select("id").maybeSingle();

    if (error || !insertedContract) {
      toast.error("Erro ao gerar contrato");
      console.error(error);
      return null;
    }

    if (options?.autoCreateSigners !== false) {
      const roles = ["matriz", "revendedor", "colaborador", "vendedor"];
      const signatureRecords = roles.map((role) => {
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
        return {
          contract_id: insertedContract.id,
          signer_role: role,
          signing_token: token,
          signer_name: role === "revendedor" ? (company as any).responsavel : null,
          signer_document: role === "revendedor" ? (company as any).cnpj : null,
        };
      });

      const { error: sigError } = await supabase.from("contract_signatures").insert(signatureRecords as any);
      if (sigError) {
        console.error("Erro ao criar assinaturas:", sigError);
      }
    }

    toast.success("Contrato gerado com sucesso!");
    await fetchContracts();
    return {
      id: insertedContract.id,
      signatureLink: `${window.location.origin}/assinar/${signingToken}`,
      content,
      code: "Contrato",
      companyName: company.razao_social,
    };
  };

  const signContract = async (
    contractId: string,
    photoBlob: Blob,
    location: { lat: number; lng: number; address: string },
    signerName: string,
    signerDocument: string
  ) => {
    try {
      const contract = contracts.find((item) => item.id === contractId);
      const signedAt = new Date().toISOString();
      const documentHash = await generateDocumentHash(
        `${contractId}|${contract?.contract_content || ""}|${signerName}|${signerDocument}|${signedAt}`
      );
      const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

      const fileName = `${contractId}_${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(fileName, photoBlob, { contentType: "image/jpeg" });
      if (uploadErr) throw uploadErr;

      const { data: signedUrlData } = await supabase.storage.from("signatures").createSignedUrl(fileName, 2592000);

      const { error: updateErr } = await supabase
        .from("contracts")
        .update({
          signature_status: "signed",
          signed_at: signedAt,
          signature_photo_url: signedUrlData?.signedUrl || "",
          signature_latitude: location.lat,
          signature_longitude: location.lng,
          signature_address: location.address,
          signer_name: signerName,
          signer_document: signerDocument,
          document_hash: documentHash,
          validation_code: validationCode,
        } as any)
        .eq("id", contractId);
      if (updateErr) throw updateErr;

      toast.success("Contrato assinado com sucesso!");
      await fetchContracts();
      return true;
    } catch (e: any) {
      toast.error("Erro ao assinar: " + (e.message || "tente novamente"));
      return false;
    }
  };

  return { contracts, loading, fetchContracts, createContract, signContract };
}
