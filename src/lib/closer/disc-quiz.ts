import type { DiscKey } from "./disc-data";

export type QuizOption = { key: DiscKey; text: string };
export type QuizQuestion = { id: number; prompt: string; options: QuizOption[] };

export const quizQuestions: QuizQuestion[] = [
  { id: 1, prompt: "Em uma negociação difícil, eu tendo a:", options: [
    { key: "D", text: "Ir direto ao ponto e propor uma solução rápida" },
    { key: "I", text: "Conversar bastante pra deixar o clima leve antes de seguir" },
    { key: "S", text: "Ouvir com calma antes de dizer qualquer coisa" },
    { key: "C", text: "Analisar os detalhes antes de me posicionar" },
  ] },
  { id: 2, prompt: "Quando recebo uma objeção, minha reação natural é:", options: [
    { key: "D", text: "Rebater na hora, sem rodeio" },
    { key: "I", text: "Usar uma história ou exemplo pra contornar" },
    { key: "S", text: "Validar o sentimento do cliente antes de responder" },
    { key: "C", text: "Pedir mais informação pra entender a real causa" },
  ] },
  { id: 3, prompt: "No meu dia a dia de trabalho, as pessoas me descrevem como:", options: [
    { key: "D", text: "Decidido(a) e direto(a)" },
    { key: "I", text: "Comunicativo(a) e animado(a)" },
    { key: "S", text: "Paciente e confiável" },
    { key: "C", text: "Organizado(a) e detalhista" },
  ] },
  { id: 4, prompt: "O que mais me incomoda numa conversa de venda é:", options: [
    { key: "D", text: "Enrolação e demora pra chegar numa decisão" },
    { key: "I", text: "Um clima frio ou sem nenhuma interação" },
    { key: "S", text: "Pressa demais sem entender o cliente" },
    { key: "C", text: "Falta de dado ou informação concreta" },
  ] },
  { id: 5, prompt: "Quando fecho uma venda, o que mais me motiva é:", options: [
    { key: "D", text: "O resultado e a meta batida" },
    { key: "I", text: "A conexão que criei com o cliente" },
    { key: "S", text: "Saber que o cliente realmente confiou em mim" },
    { key: "C", text: "Saber que expliquei tudo certo e sem furo" },
  ] },
  { id: 6, prompt: "Sob pressão, eu costumo:", options: [
    { key: "D", text: "Acelerar e tomar a frente" },
    { key: "I", text: "Buscar apoio e conversar com alguém" },
    { key: "S", text: "Manter a calma e seguir o ritmo de sempre" },
    { key: "C", text: "Revisar os detalhes pra não errar" },
  ] },
  { id: 7, prompt: "Numa reunião de equipe, eu normalmente:", options: [
    { key: "D", text: "Vou direto na pauta principal" },
    { key: "I", text: "Puxo papo e energizo o grupo" },
    { key: "S", text: "Escuto mais do que falo" },
    { key: "C", text: "Faço perguntas pra entender tudo certinho" },
  ] },
  { id: 8, prompt: "O que mais me dá segurança antes de uma decisão importante é:", options: [
    { key: "D", text: "Confiar no meu instinto e agir" },
    { key: "I", text: "Sentir que as pessoas envolvidas estão confortáveis" },
    { key: "S", text: "Ter certeza de que não vou prejudicar ninguém" },
    { key: "C", text: "Ter todos os dados e informações na mão" },
  ] },
];

export type ProfileResult = {
  strengths: string[];
  watchOut: string[];
  neverUse: { title: string; text: string };
  conclusion: string;
};

export const profileResults: Record<DiscKey, ProfileResult> = {
  D: {
    strengths: ["Toma decisão rápido e empurra o cliente pro fechamento","Não tem medo de pedir o pedido nem de lidar com 'não'","Foco absoluto em resultado — bate meta com consistência","Conduz a reunião, não fica refém da agenda do cliente"],
    watchOut: ["Pode atropelar o cliente que precisa de tempo pra decidir","Tom firme demais soa como pressão e gera objeção 'vou pensar'","Tende a ignorar o lado emocional da venda","Pode perder cliente Analítico por achar dado e detalhe 'enrolação'"],
    neverUse: { title: "Sua agressividade comercial", text: "Sua maior força — pressão pra fechar agora — é a sua maior armadilha com cliente S e C. Eles travam quando se sentem empurrados. Aprenda a desacelerar nos 30% finais da conversa: o fechamento rápido fica pro D e I, não pro perfil que pede tempo." },
    conclusion: "Você fecha porque conduz. Mas vender bem é saber a hora de calar a boca e deixar o cliente respirar. Mantenha o instinto de fechar, só ajuste o ritmo: com D e I você acelera, com S e C você dá espaço. Sua meta não some se você esperar 2 minutos a mais.",
  },
  I: {
    strengths: ["Cria conexão genuína em segundos — cliente sente que conhece você","Usa storytelling e exemplo prático com naturalidade","Energia que contagia e quebra clima frio na hora","Lida muito bem com objeção emocional e insegurança"],
    watchOut: ["Fala demais e esquece de fechar","Pode soar superficial pro cliente Analítico","Cria expectativa que nem sempre o produto entrega","Tende a evitar conversa difícil pra não 'quebrar o clima'"],
    neverUse: { title: "Seu carisma como muleta", text: "Cliente gostar de você não é venda fechada. Seu maior risco é confundir conversa boa com negociação avançando. Toda interação precisa terminar com um próximo passo claro — data, valor, decisão. Sem isso, você vira amigo do cliente e perde a venda pro concorrente mais objetivo." },
    conclusion: "Você vende pela relação, e isso é raro. Mas relação sem técnica vira só papo. Treine o fechamento direto, peça o pedido sem medo de 'estragar o clima'. Cliente respeita vendedor que sabe a hora de parar de contar história e pedir o sim.",
  },
  S: {
    strengths: ["Cliente confia em você rápido — você não force, você acolhe","Escuta de verdade, identifica a real necessidade","Excelente em pós-venda e fidelização","Lida muito bem com cliente inseguro e família envolvida na decisão"],
    watchOut: ["Dificuldade pra pedir o fechamento — espera o cliente decidir sozinho","Pode aceitar 'vou pensar' sem rebater","Evita conflito até quando precisa pressionar","Tende a entregar desconto antes do cliente pedir, com medo de perder"],
    neverUse: { title: "Sua paciência como desculpa", text: "Sua calma vira armadilha quando vira passividade. Cliente que diz 'depois eu te retorno' e some é cliente que você não fechou — não porque ele não quis, mas porque você não pediu. Paciência é virtude no atendimento. No fechamento, é prejuízo." },
    conclusion: "Você tem o que ninguém aprende em treinamento: confiança natural do cliente. Use isso pra ter coragem de pedir o sim. Quem confia em você quer ser conduzido por você. Não tenha medo de fechar — tenha medo de deixar o cliente ir embora indeciso.",
  },
  C: {
    strengths: ["Domínio total do produto — responde qualquer dúvida técnica","Cliente Analítico te respeita imediatamente","Proposta sempre organizada, sem furo, sem promessa vaga","Constrói credibilidade com dado, não com lábia"],
    watchOut: ["Excesso de detalhe trava cliente D que quer decidir rápido","Tom técnico afasta cliente I que quer conexão emocional","Tende a sobrecarregar o cliente com informação na hora de fechar","Pode parecer frio ou distante mesmo quando está engajado"],
    neverUse: { title: "Sua precisão como escudo", text: "Você se esconde atrás do dado pra não pedir o pedido. 'Vou te mandar mais uma planilha' vira desculpa pra adiar o fechamento. Cliente não compra planilha, compra decisão. Sua maior força — preparação técnica — não pode virar muleta pra evitar o momento de pedir o sim." },
    conclusion: "Você é o vendedor que cliente exigente procura. Mas técnica sem fechamento é consultoria gratuita. Reserve os 20% finais da conversa pra pedir decisão clara, sem mais slide, sem mais planilha. Você já provou que sabe — agora prove que vende.",
  },
};

export type SavedProfile = {
  primary: DiscKey;
  secondary?: DiscKey;
  date: string;
  answers: DiscKey[];
  name?: string;
};

const STORAGE_KEY = "closer:disc-profile";

export function saveProfile(p: SavedProfile) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ } }
export function loadProfile(): SavedProfile | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as SavedProfile : null; } catch { return null; }
}
export function clearProfile() { try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } }

export function computeResult(answers: DiscKey[]): { primary: DiscKey; secondary?: DiscKey } {
  const counts: Record<DiscKey, number> = { D: 0, I: 0, S: 0, C: 0 };
  for (const a of answers) counts[a]++;
  const sorted = (Object.keys(counts) as DiscKey[]).sort((a, b) => counts[b] - counts[a]);
  const primary = sorted[0];
  const secondary = counts[sorted[1]] === counts[primary] ? sorted[1] : undefined;
  return { primary, secondary };
}
