/**
 * Modelo de Contrato SaaS Padrão – Accord
 * Contrato de Licenciamento e Prestação de Serviços de Software como Serviço (SaaS)
 * Protege contra fraude, inadimplência e quebra de contrato.
 * Vigência mínima: 12 meses. Multa rescisória prevista.
 */

export interface ContractVariables {
  contratante_razao_social: string;
  contratante_cnpj: string;
  contratante_endereco: string;
  contratante_responsavel: string;
  contratante_cpf_responsavel: string;
  contratante_email: string;
  contratante_telefone: string;
  plano_nome: string;
  data_inicio: string;
  foro: string;
}

export const ACCORD_CONTRACT_TEMPLATE = `CONTRATO DE LICENCIAMENTO E PRESTAÇÃO DE SERVIÇOS DE SOFTWARE COMO SERVIÇO (SaaS)

Pelo presente instrumento particular, de um lado:

CONTRATADA:
{{empresa_nome}}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº {{empresa_cnpj}}, com sede em {{empresa_endereco}}, neste ato representada por seu representante legal, doravante denominada simplesmente "CONTRATADA";

CONTRATANTE:
{{contratante_razao_social}}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº {{contratante_cnpj}}, com sede em {{contratante_endereco}}, neste ato representada por {{contratante_responsavel}}, portador(a) do CPF nº {{contratante_cpf_responsavel}}, e-mail {{contratante_email}}, telefone {{contratante_telefone}}, doravante denominada simplesmente "CONTRATANTE";

As partes acima qualificadas celebram o presente Contrato de Licenciamento e Prestação de Serviços de Software como Serviço (SaaS), que se regerá pelas seguintes cláusulas e condições:

CLÁUSULA PRIMEIRA – DO OBJETO

1.1. O presente contrato tem por objeto o licenciamento de uso, em regime de Software como Serviço (SaaS), da plataforma tecnológica denominada "ACCORD", incluindo todos os módulos, funcionalidades, atualizações e melhorias disponibilizados durante a vigência contratual.

1.2. A plataforma ACCORD compreende, sem limitação, os seguintes módulos: CRM de Vendas, Gestão de Contratos e Assinaturas Digitais, Gestão Financeira, Base de Clientes, Relatórios e Dashboards, Accord AI (Inteligência Artificial), Gestão de Documentos (Drive), Caixa de Entrada (Atendimento Multicanal) e Gestão de Acesso (RBAC).

1.3. A CONTRATADA se reserva o direito de adicionar, modificar ou descontinuar funcionalidades da plataforma, mediante aviso prévio de 30 (trinta) dias, desde que não prejudique substancialmente os serviços contratados.

CLÁUSULA SEGUNDA – DA VIGÊNCIA E RENOVAÇÃO

2.1. O presente contrato terá vigência mínima de 12 (doze) meses, contados a partir da data de ativação da plataforma, conforme indicado na data de início: {{data_inicio}}.

2.2. Findo o prazo mínimo, o contrato será automaticamente renovado por períodos sucessivos de 12 (doze) meses, salvo manifestação expressa de qualquer das partes, por escrito, com antecedência mínima de 30 (trinta) dias do término do período vigente.

2.3. A CONTRATANTE reconhece que a vigência mínima é condição essencial para a concessão das condições comerciais pactuadas.

CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DA CONTRATADA

3.1. Disponibilizar a plataforma ACCORD em regime de alta disponibilidade, com SLA (Service Level Agreement) mínimo de 99,5% (noventa e nove vírgula cinco por cento) de uptime mensal.

3.2. Realizar backups automáticos diários dos dados da CONTRATANTE, com retenção mínima de 30 (trinta) dias.

3.3. Fornecer suporte técnico via canais oficiais (chat, e-mail e WhatsApp) em horário comercial (segunda a sexta-feira, das 08h às 18h, horário de Brasília), com tempo máximo de resposta de 24 (vinte e quatro) horas úteis.

3.4. Implementar e manter medidas de segurança compatíveis com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD), incluindo criptografia de dados em trânsito e em repouso.

3.5. Notificar a CONTRATANTE, no prazo máximo de 72 (setenta e duas) horas, sobre qualquer incidente de segurança que comprometa dados pessoais ou sensíveis.

CLÁUSULA QUARTA – DAS OBRIGAÇÕES DA CONTRATANTE

4.1. Utilizar a plataforma ACCORD exclusivamente para fins lícitos e em conformidade com a legislação vigente, especialmente a LGPD.

4.2. Manter a confidencialidade de suas credenciais de acesso (login e senha), sendo integralmente responsável por qualquer uso indevido decorrente de negligência na guarda dessas informações.

4.3. Não realizar engenharia reversa, descompilar, copiar, reproduzir, distribuir, sublicenciar ou transferir, total ou parcialmente, o software ou qualquer componente da plataforma ACCORD.

4.4. Não utilizar a plataforma para armazenar, transmitir ou processar conteúdo ilegal, difamatório, discriminatório, que viole direitos de terceiros ou que contenha vírus, malware ou códigos maliciosos.

4.5. Manter seus dados cadastrais atualizados, especialmente endereço de e-mail e telefone para comunicações e cobranças.

4.6. Efetuar o pagamento das mensalidades na data de vencimento pactuada, conforme estipulado na Cláusula Sexta.

CLÁUSULA QUINTA – DA PROPRIEDADE INTELECTUAL

5.1. A plataforma ACCORD, incluindo mas não se limitando a seu código-fonte, design, arquitetura, algoritmos, interfaces, marcas, logotipos, documentação e quaisquer materiais relacionados, são de propriedade exclusiva e integral da CONTRATADA, protegidos pela Lei de Propriedade Industrial (Lei nº 9.279/96), Lei de Direitos Autorais (Lei nº 9.610/98) e Lei de Software (Lei nº 9.609/98).

5.2. O presente contrato não transfere à CONTRATANTE qualquer direito de propriedade intelectual sobre a plataforma, concedendo apenas licença temporária, não exclusiva e intransferível de uso.

5.3. Os dados inseridos pela CONTRATANTE na plataforma são de sua exclusiva propriedade. A CONTRATADA não utilizará tais dados para fins comerciais próprios, respeitando integralmente a LGPD.

CLÁUSULA SEXTA – DO VALOR E CONDIÇÕES DE PAGAMENTO

6.1. Pela licença de uso e prestação dos serviços descritos neste contrato, a CONTRATANTE pagará à CONTRATADA o plano contratado conforme condições abaixo:

• Plano contratado: {{plano_nome}}

__________________________________________________________

ESPAÇO RESERVADO PARA VALORES E CONDIÇÕES COMERCIAIS
(Preencher conforme proposta comercial aceita)

• Valor mensal: R$ _______________
• Forma de pagamento: _______________
• Data de vencimento: dia ___ de cada mês
• Desconto concedido (se aplicável): _______________
• Valor da taxa de implantação (se aplicável): R$ _______________

__________________________________________________________

6.2. Os valores poderão ser reajustados anualmente pelo IGPM/FGV ou, na sua falta, pelo IPCA/IBGE, acumulado nos últimos 12 (doze) meses, aplicado automaticamente na data de aniversário do contrato.

6.3. Em caso de reajuste superior ao índice oficial, a CONTRATANTE será notificada com 30 (trinta) dias de antecedência.

CLÁUSULA SÉTIMA – DA INADIMPLÊNCIA E PENALIDADES

7.1. O atraso no pagamento de qualquer parcela acarretará, de pleno direito e independentemente de notificação:
• Multa moratória de 2% (dois por cento) sobre o valor em atraso;
• Juros de mora de 1% (um por cento) ao mês, calculados pro rata die;
• Correção monetária pelo IGPM/FGV ou IPCA/IBGE.

7.2. O atraso superior a 15 (quinze) dias corridos facultará à CONTRATADA a suspensão imediata do acesso à plataforma, sem prejuízo da cobrança dos valores devidos.

7.3. O atraso superior a 30 (trinta) dias corridos facultará à CONTRATADA a rescisão unilateral do contrato, com cobrança integral das parcelas vincendas até o término da vigência mínima, a título de cláusula penal compensatória.

7.4. A CONTRATADA poderá inscrever o débito em órgãos de proteção ao crédito (SPC/Serasa) e/ou promover cobrança judicial ou extrajudicial, ficando a CONTRATANTE responsável por todas as custas, despesas processuais e honorários advocatícios de 20% (vinte por cento) sobre o valor total do débito.

7.5. A suspensão de acesso por inadimplência não exime a CONTRATANTE do pagamento das mensalidades referentes ao período de suspensão.

CLÁUSULA OITAVA – DA RESCISÃO E MULTA POR QUEBRA DE CONTRATO

8.1. A rescisão antecipada do presente contrato pela CONTRATANTE, durante o período de vigência mínima (12 meses), acarretará o pagamento de multa rescisória equivalente a 40% (quarenta por cento) do valor total remanescente das parcelas vincendas até o término da vigência mínima, a título de cláusula penal compensatória, sem prejuízo do pagamento integral das parcelas vencidas e não pagas.

8.2. A multa rescisória prevista no item 8.1 visa compensar os investimentos realizados pela CONTRATADA em infraestrutura, implantação, treinamento e suporte dedicados à CONTRATANTE.

8.3. A CONTRATADA poderá rescindir o contrato sem ônus nos seguintes casos:
a) Inadimplência da CONTRATANTE por período superior a 30 (trinta) dias;
b) Uso indevido ou ilegal da plataforma;
c) Violação de qualquer cláusula deste contrato;
d) Decretação de falência, recuperação judicial ou extrajudicial da CONTRATANTE.

8.4. Em caso de rescisão por qualquer motivo, a CONTRATADA disponibilizará os dados da CONTRATANTE em formato exportável (CSV/PDF) pelo prazo de 30 (trinta) dias contados da rescisão, após o qual os dados serão definitivamente excluídos.

8.5. A rescisão imotivada após o período de vigência mínima poderá ser exercida por qualquer das partes, mediante aviso prévio de 30 (trinta) dias, sem incidência de multa.

CLÁUSULA NONA – DA CONFIDENCIALIDADE

9.1. As partes se comprometem a manter sigilo absoluto sobre todas as informações técnicas, comerciais, operacionais e estratégicas a que tiverem acesso em razão deste contrato, pelo prazo de 5 (cinco) anos contados do término da relação contratual.

9.2. A obrigação de confidencialidade não se aplica a informações que:
a) Sejam de domínio público na data da divulgação;
b) Sejam obtidas legalmente de terceiros sem restrição de confidencialidade;
c) Devam ser divulgadas por determinação judicial ou administrativa.

CLÁUSULA DÉCIMA – DA PROTEÇÃO DE DADOS (LGPD)

10.1. As partes se comprometem a cumprir integralmente a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD).

10.2. Para os fins deste contrato, a CONTRATANTE atua como CONTROLADORA dos dados pessoais inseridos na plataforma, e a CONTRATADA atua como OPERADORA dos dados.

10.3. A CONTRATADA processará os dados pessoais exclusivamente conforme as instruções da CONTRATANTE e para a finalidade de prestação dos serviços contratados.

10.4. A CONTRATADA implementará medidas técnicas e organizacionais apropriadas para garantir a segurança dos dados pessoais contra acessos não autorizados, destruição, perda, alteração ou vazamento.

CLÁUSULA DÉCIMA PRIMEIRA – DA LIMITAÇÃO DE RESPONSABILIDADE

11.1. A responsabilidade total da CONTRATADA, por qualquer causa relacionada a este contrato, será limitada ao valor equivalente às últimas 3 (três) mensalidades efetivamente pagas pela CONTRATANTE.

11.2. A CONTRATADA não será responsável por danos indiretos, lucros cessantes, perda de dados decorrentes de caso fortuito ou força maior, interrupções causadas por falhas de infraestrutura de terceiros (provedores de internet, energia elétrica) ou uso indevido da plataforma pela CONTRATANTE.

11.3. A CONTRATANTE é exclusivamente responsável pela veracidade, legalidade e adequação dos dados e conteúdos inseridos na plataforma.

CLÁUSULA DÉCIMA SEGUNDA – DA FORÇA MAIOR E CASO FORTUITO

12.1. Nenhuma das partes será responsável pelo descumprimento de obrigações decorrente de caso fortuito ou força maior, conforme definido no art. 393 do Código Civil Brasileiro, incluindo, mas não se limitando a: desastres naturais, pandemias, guerras, atos de terrorismo, greves generalizadas, falhas em infraestrutura de telecomunicações e atos governamentais.

CLÁUSULA DÉCIMA TERCEIRA – DAS DISPOSIÇÕES GERAIS

13.1. Este contrato constitui o acordo integral entre as partes quanto ao seu objeto, substituindo todas as negociações, propostas e entendimentos anteriores, verbais ou escritos.

13.2. Qualquer alteração deste contrato somente será válida se formalizada por escrito e assinada por ambas as partes ou por meio digital com validade jurídica.

13.3. A tolerância de qualquer das partes quanto ao descumprimento de obrigações pela outra não constituirá novação, renúncia ou precedente invocável.

13.4. Se qualquer cláusula deste contrato for considerada nula ou inexequível, as demais permanecerão em pleno vigor e efeito.

13.5. As comunicações entre as partes serão realizadas preferencialmente por meio eletrônico (e-mail), para os endereços informados no preâmbulo, considerando-se válidas e eficazes para todos os efeitos legais.

CLÁUSULA DÉCIMA QUARTA – DO FORO

14.1. As partes elegem o foro da Comarca de {{foro}} para dirimir quaisquer controvérsias oriundas do presente contrato, renunciando a qualquer outro, por mais privilegiado que seja.

E por estarem assim justas e contratadas, as partes firmam o presente instrumento por meio de assinatura digital, com validade jurídica nos termos da Medida Provisória nº 2.200-2/2001 e do art. 10, § 2º, da mesma norma.

{{cidade}}, {{data_assinatura}}


___________________________________________
CONTRATADA: {{empresa_nome}}
CNPJ: {{empresa_cnpj}}


___________________________________________
CONTRATANTE: {{contratante_razao_social}}
CNPJ: {{contratante_cnpj}}
Representante: {{contratante_responsavel}}
CPF: {{contratante_cpf_responsavel}}
`;

/**
 * Substitui as variáveis do template pelos dados reais
 */
export function fillContractTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || `[${key.toUpperCase()}]`);
  }
  return result;
}

/**
 * Retorna o template padrão já preenchido com dados da empresa (contratada)
 * e variáveis do contratante
 */
export function generateAccordContract(
  empresa: {
    nome: string;
    cnpj: string;
    endereco: string;
    cidade: string;
  },
  contratante: ContractVariables
): string {
  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return fillContractTemplate(ACCORD_CONTRACT_TEMPLATE, {
    empresa_nome: empresa.nome,
    empresa_cnpj: empresa.cnpj,
    empresa_endereco: empresa.endereco,
    cidade: empresa.cidade || contratante.foro,
    data_assinatura: hoje,
    contratante_razao_social: contratante.contratante_razao_social,
    contratante_cnpj: contratante.contratante_cnpj,
    contratante_endereco: contratante.contratante_endereco,
    contratante_responsavel: contratante.contratante_responsavel,
    contratante_cpf_responsavel: contratante.contratante_cpf_responsavel,
    contratante_email: contratante.contratante_email,
    contratante_telefone: contratante.contratante_telefone,
    plano_nome: contratante.plano_nome,
    data_inicio: contratante.data_inicio,
    foro: contratante.foro,
  });
}
