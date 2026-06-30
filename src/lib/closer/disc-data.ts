export type DiscKey = "D" | "I" | "S" | "C";

export const profiles: Record<
  DiscKey,
  { name: string; focus: string; colorVar: string; ring: string; bg: string; text: string; border: string }
> = {
  D: { name: "Dominante",  focus: "Direto, sem rodeios, decide rápido",            colorVar: "disc-d", ring: "ring-[var(--disc-d)]", bg: "bg-[var(--disc-d)]", text: "text-[var(--disc-d)]", border: "border-[var(--disc-d)]" },
  I: { name: "Influente",  focus: "Sociável, emocional, gosta de conexão",         colorVar: "disc-i", ring: "ring-[var(--disc-i)]", bg: "bg-[var(--disc-i)]", text: "text-[var(--disc-i)]", border: "border-[var(--disc-i)]" },
  S: { name: "Estável",    focus: "Calmo, busca segurança e confiança",            colorVar: "disc-s", ring: "ring-[var(--disc-s)]", bg: "bg-[var(--disc-s)]", text: "text-[var(--disc-s)]", border: "border-[var(--disc-s)]" },
  C: { name: "Analítico",  focus: "Lógico, quer dados, detalhes e provas",         colorVar: "disc-c", ring: "ring-[var(--disc-c)]", bg: "bg-[var(--disc-c)]", text: "text-[var(--disc-c)]", border: "border-[var(--disc-c)]" },
};

export const stages = ["Abordagem","Abertura","Geração de Percepção","Construção de Valor","Fechamento"] as const;
export type Stage = (typeof stages)[number];

export const scripts: Record<DiscKey, Record<Stage, string[]>> = {
  D: {
    Abertura: ["Vou ser direto contigo pra não te tomar tempo. Quero entender só o essencial pra te falar se faz sentido ou não."],
    Abordagem: ["Me responde rápido: hoje, se seu carro fosse roubado agora, você está coberto ou tomaria prejuízo do bolso?","Quanto você gasta por mês com seguro? Vou te mostrar como pagar menos da metade com a mesma proteção."],
    "Geração de Percepção": ["Sem proteção, um único sinistro pode custar de 30 a 80 mil reais. Você quer correr esse risco ou resolver agora?","A diferença entre quem se protege e quem se arrepende é uma ligação como essa. Você quer estar de que lado?"],
    "Construção de Valor": ["Por menos do que você gasta com gasolina numa semana, seu carro fica 100% protegido contra roubo, furto e colisão. Faz sentido?","Eu não vendo seguro, vendo tranquilidade. E o seu retorno é direto: menos custo, mais cobertura, decisão em 5 minutos."],
    Fechamento: ["Vamos fechar agora? Te mando o link de adesão por WhatsApp e em 10 minutos seu carro já está protegido.","Você é do tipo que decide. Me passa CPF e placa que eu ativo hoje ainda."],
  },
  I: {
    Abertura: ["Me conta uma coisa, já passou por algum perrengue com carro ou conhece alguém que já ficou na mão?"],
    Abordagem: ["Me conta uma coisa: como é a sua relação com o seu carro? Você usa pra trabalhar, passear, levar a família?","Imagina poder dirigir sem aquele aperto no peito de 'e se acontecer algo'? É exatamente sobre isso que quero te falar."],
    "Geração de Percepção": ["Outro dia atendi um cliente que perdeu o carro e ficou meses sem se reerguer financeiramente. A gente nunca acha que vai acontecer, né?","Sabe aquela sensação boa de saber que tá tudo certo? É isso que a nossa proteção entrega — pra você e pra sua família."],
    "Construção de Valor": ["Mais de 50 mil pessoas já estão com a gente e dormem tranquilas. Você merece fazer parte dessa galera também!","Além da proteção, você ganha guincho 24h, carro reserva e um time que te atende como amigo, não como número."],
    Fechamento: ["Bora dar esse presente pra você hoje? Em 5 minutinhos eu deixo tudo ativado e você já sai daqui protegido!","Que tal a gente comemorar essa decisão? Me passa seus dados que eu cuido de tudo pra você 😊"],
  },
  S: {
    Abertura: ["Vou te explicar com calma e entender seu cenário pra ver se isso faz sentido pra sua rotina."],
    Abordagem: ["Hoje você tem alguma proteção pro seu carro? Como está se sentindo em relação a isso?","O que é mais importante pra você quando o assunto é proteger seu veículo: preço, atendimento ou segurança da empresa?"],
    "Geração de Percepção": ["Entendo perfeitamente. Muita gente adia essa decisão até acontecer algo — e aí o prejuízo é grande, tanto financeiro quanto emocional.","Imagino o quanto seu carro é importante pra sua rotina e sua família. Estar protegido é cuidar de quem você ama."],
    "Construção de Valor": ["Somos uma empresa sólida, com mais de X anos de mercado e milhares de clientes atendidos. Você está em boas mãos.","Nosso atendimento é humano, sem letras miúdas. Você fala com gente de verdade, antes, durante e depois."],
    Fechamento: ["Sem pressão. Vamos dar esse passo no seu tempo — quer que eu te mande tudo por escrito pra você analisar com calma?","Posso te ajudar a deixar tudo certo agora? É simples, seguro e você tem 7 dias pra repensar se quiser."],
  },
  C: {
    Abertura: ["Quero entender bem seu cenário pra te explicar exatamente como funciona e se faz sentido pra você."],
    Abordagem: ["Você já comparou valores de seguro tradicional com proteção veicular? Posso te mostrar a diferença real em planilha.","Quais coberturas você considera indispensáveis? Roubo, furto, colisão, terceiros, assistência 24h?"],
    "Geração de Percepção": ["Segundo dados do setor, 1 a cada 200 veículos sofre sinistro por ano. Sem proteção, o custo médio é de R$ 42 mil.","Nossa associação tem índice de sinistralidade de X% e tempo médio de indenização de Y dias — comprovado em relatório auditado."],
    "Construção de Valor": ["Pelo valor de R$ X/mês você tem cobertura de 100% FIPE, sem franquia em roubo/furto e sem perfil de condutor. Te envio o contrato pra análise.","Comparando com seguro tradicional: economia média de 40% ao ano, sem cláusula de bônus e sem reajuste por sinistro."],
    Fechamento: ["Posso te encaminhar a proposta formal por e-mail com todas as cláusulas. Qual seu melhor endereço?","Se os números fazem sentido, podemos prosseguir com a adesão. Você prefere analisar o contrato antes ou avançar direto?"],
  },
};

export const objections: { title: string; response: string }[] = [
  { title: "Preciso falar com a esposa ou marido", response: "Tá, mas por você, você estaria fechado?" },
  { title: "Vou pensar com calma e já te retorno", response: "Quando meus clientes falam que vão pensar, é em relação a preço, insegurança ou falta de prioridade agora — dos 3, qual seria o teu caso?" },
  { title: "Tô meio inseguro com essa solução", response: "Se eu pegar o telefone aqui e ligar pra 3 clientes meus pra eles atenderem agora e te mostrarem o resultado da minha metodologia, isso te deixaria mais seguro?" },
  { title: "Achei caro", response: "Caro comparado a quê? Ao valor ou ao problema que isso resolve?\n\nPorque se a solução te trouxer retorno, economia ou mais controle, talvez o caro seja continuar sem resolver." },
  { title: "Não é o momento", response: "Mas quando você fala que não é o momento, sendo que aqui juntos a gente identificou diversos problemas que estão te fazendo perder dinheiro todos os meses — só o fato de você sair dessa reunião já te faz perder dinheiro." },
  { title: "Não fecho contrato que tem fidelidade", response: "Olha, quando a gente está negociando e você já está mirando na fidelidade do contrato, você não está pensando em resultado e sim em cancelamento.\n\nEu queria entender: por qual motivo você está olhando somente para o cancelamento e não para o resultado que vou te entregar? Eu preciso do prazo de fidelidade pra que você fique no projeto e eu te entregue o resultado." },
];

export const followUp =
  "[Nome do cliente], tínhamos compromisso pra hoje onde você me retornaria com sim ou não se íamos seguir com a proposta e você já começar a faturar com o sistema de ponto WhiteLabel.\n\nVamos pra cima?";
