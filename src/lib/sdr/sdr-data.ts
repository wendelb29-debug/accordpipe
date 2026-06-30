import type { DiscKey } from "./sdr-storage";

export const bantQuestions = {
  budget: "Qual o orçamento que vocês já reservaram pra resolver isso?",
  authority: "Além de você, quem mais participa dessa decisão?",
  need: "O que te fez olhar pra essa solução agora?",
  timeline: "Em quanto tempo vocês precisam ter isso rodando?",
};
export const champQuestions = {
  challenge: "Qual o maior desafio que vocês querem resolver hoje?",
  authority: "Você é quem decide ou tem mais alguém envolvido?",
  money: "Quanto esse problema custa pra vocês hoje?",
  prioritization: "Onde isso entra na lista de prioridades do trimestre?",
};
export const gpctQuestions = {
  goals: "Qual a meta que vocês querem atingir nos próximos 90 dias?",
  plans: "O que vocês já tentaram pra chegar lá?",
  challenges: "O que tá travando essa meta hoje?",
  timeline: "Qual o prazo pra você ver resultado?",
};
export const spinQuestions = {
  situation: "Como vocês fazem isso hoje?",
  problem: "Onde esse processo mais falha?",
  implication: "O que acontece se isso continuar assim por mais 6 meses?",
  need: "Como ficaria pra vocês resolver isso ainda esse mês?",
};

export const discProfiles: Record<DiscKey, { name: string; short: string; how: string; never: string; tom: string; color: string }> = {
  D: { name: "Dominante", short: "Decidido, objetivo, foco em resultado.", how: "Vá direto ao ponto. Mostre ganho. Proponha decisão.", never: "Não enrole. Não fale de processo. Não use linguagem fofa.", tom: "Direto, firme, curto.", color: "#dc2626" },
  I: { name: "Influente", short: "Comunicativo, otimista, gosta de gente.", how: "Crie conexão, conte história, valide o entusiasmo.", never: "Não seja seco. Não vá só pra números. Não corte o papo.", tom: "Leve, animado, próximo.", color: "#f59e0b" },
  S: { name: "Estável", short: "Calmo, ponderado, busca segurança.", how: "Vá no ritmo dele. Acolha. Mostre garantia.", never: "Não pressione. Não force decisão rápida.", tom: "Acolhedor, paciente, calmo.", color: "#16a34a" },
  C: { name: "Analítico", short: "Detalhista, busca dado e precisão.", how: "Traga número, comparativo, prova. Resposta exata.", never: "Não use achismo. Não generalize. Não invente dado.", tom: "Técnico, preciso, formal.", color: "#2563eb" },
};

export const objectionTemplates: Record<string, Record<DiscKey, string>> = {
  "Está caro": {
    D: "Caro comparado a quê? Se eu te mostrar o retorno em 60 dias, fechamos hoje?",
    I: "Entendi! Deixa eu te mostrar como outros clientes parecidos com você recuperaram esse valor rapidinho.",
    S: "Faz sentido pensar no investimento. Posso te mostrar um caminho mais tranquilo, sem risco pra você?",
    C: "Vamos olhar o custo total: hoje você gasta X, com isso gasta Y. A diferença paga em Z meses. Quer ver o cálculo?",
  },
  "Vou pensar": {
    D: "Quando meus clientes falam que vão pensar, geralmente é preço, insegurança ou prioridade. Qual seria no teu caso?",
    I: "Show! Só pra eu entender, o que ficou na cabeça que você quer pensar melhor?",
    S: "Tranquilo, entendo. O que especificamente você quer avaliar com mais calma?",
    C: "Faz sentido. Tem algum dado ou cenário que faltou pra você decidir agora?",
  },
  "Não é o momento": {
    D: "Quando seria o momento? E o que muda lá que não muda agora?",
    I: "Imagina: 90 dias atrás você falou a mesma coisa de outra decisão. Hoje, ela mudaria seu cenário?",
    S: "Entendo. O que precisaria acontecer pra esse ser o momento?",
    C: "Olhando friamente, o custo de esperar 3 meses é X. Vale a pena adiar?",
  },
  "Preciso falar com alguém": {
    D: "Tá, mas por você, você estaria fechado?",
    I: "Show! Quem é essa pessoa? Que tal a gente chamar ela agora pra alinhar junto?",
    S: "Faz sentido envolver. Posso te ajudar a preparar essa conversa?",
    C: "Quais informações essa pessoa vai precisar? Te mando um resumo executivo agora.",
  },
  "Não confio ainda": {
    D: "Justo. Se eu pegar agora 3 clientes pra você falar, fechamos?",
    I: "Entendo total! Olha esses 3 casos de gente parecida com você que tava no mesmo lugar.",
    S: "Confiança se constrói. Posso te conectar com clientes nossos que tiveram a mesma dúvida?",
    C: "O que especificamente você precisa validar pra confiar? Te mando documentação, casos e dados.",
  },
};

export const closingTemplates: Record<DiscKey, { leve: string; consultivo: string; direto: string }> = {
  D: { leve: "Posso te deixar isso ativo ainda hoje?", consultivo: "Considerando tudo que conversamos, faz sentido seguirmos agora?", direto: "Te mando o contrato pra fechar hoje?" },
  I: { leve: "Bora começar essa parceria?", consultivo: "Pelo que conversamos, parece que faz total sentido. Topa começar essa semana?", direto: "Vamos fechar e já te coloco no grupo dos clientes ativos?" },
  S: { leve: "Que tal a gente avançar um passo de cada vez? Posso te mandar o contrato pra você revisar com calma?", consultivo: "Você confortável com tudo que conversamos? Posso seguir com o cadastro?", direto: "Pra eu te entregar resultado, preciso do seu ok hoje. Topa?" },
  C: { leve: "Posso enviar a proposta detalhada pra você revisar?", consultivo: "Dados batem com o que você precisa? Se sim, sigo com o contrato.", direto: "Validei todos os pontos técnicos. Fecha hoje?" },
};
