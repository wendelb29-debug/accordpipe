export type Channel = "whatsapp" | "messenger" | "instagram" | "telegram";

export interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  labels: string[];
  assignedTo?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  status: "online" | "offline" | "typing";
  channel: Channel;
  channels: Channel[]; // all channels this contact is available on
}

export interface WhatsAppMessage {
  id: string;
  contactId: string;
  text: string;
  timestamp: string;
  direction: "inbound" | "outbound";
  status: "sent" | "delivered" | "read" | "failed";
  type: "text" | "image" | "document" | "audio";
  channel: Channel;
}

export interface WhatsAppLabel {
  id: string;
  name: string;
  color: string;
  count: number;
}

export const channelMeta: Record<Channel, { name: string; color: string; bg: string }> = {
  whatsapp:  { name: "WhatsApp",  color: "#25D366", bg: "#25D36618" },
  messenger: { name: "Messenger", color: "#0084FF", bg: "#0084FF18" },
  instagram: { name: "Instagram", color: "#E1306C", bg: "#E1306C18" },
  telegram:  { name: "Telegram",  color: "#0088CC", bg: "#0088CC18" },
};

export const mockLabels: WhatsAppLabel[] = [
  { id: "1", name: "Lead Quente", color: "hsl(0 84% 60%)", count: 8 },
  { id: "2", name: "Negociação", color: "hsl(38 92% 50%)", count: 12 },
  { id: "3", name: "Cliente Ativo", color: "hsl(142 71% 45%)", count: 34 },
  { id: "4", name: "Suporte", color: "hsl(221 83% 53%)", count: 5 },
  { id: "5", name: "Pós-venda", color: "hsl(271 81% 56%)", count: 3 },
];

export const mockContacts: WhatsAppContact[] = [
  { id: "1", name: "João Silva", phone: "+5511999887766", labels: ["1", "2"], assignedTo: "Carlos", lastMessage: "Boa tarde, gostaria de saber sobre os planos", lastMessageTime: "14:32", unreadCount: 3, status: "online", channel: "whatsapp", channels: ["whatsapp", "telegram"] },
  { id: "2", name: "Maria Santos", phone: "+5521988776655", labels: ["3"], assignedTo: "Ana", lastMessage: "Obrigada pela informação!", lastMessageTime: "13:45", unreadCount: 0, status: "offline", channel: "messenger", channels: ["messenger", "instagram"] },
  { id: "3", name: "Pedro Oliveira", phone: "+5531977665544", labels: ["2"], assignedTo: "Carlos", lastMessage: "Posso agendar para amanhã?", lastMessageTime: "12:20", unreadCount: 1, status: "typing", channel: "whatsapp", channels: ["whatsapp"] },
  { id: "4", name: "Ana Costa", phone: "+5541966554433", labels: ["4"], assignedTo: "Ana", lastMessage: "O sistema está apresentando um erro", lastMessageTime: "11:50", unreadCount: 2, status: "offline", channel: "instagram", channels: ["instagram", "whatsapp"] },
  { id: "5", name: "Lucas Ferreira", phone: "+5551955443322", labels: ["1"], lastMessage: "Vi a propaganda e tenho interesse", lastMessageTime: "10:30", unreadCount: 5, status: "online", channel: "telegram", channels: ["telegram", "whatsapp"] },
  { id: "6", name: "Fernanda Lima", phone: "+5561944332211", labels: ["3", "5"], assignedTo: "Carlos", lastMessage: "Tudo certo com a instalação, obrigada!", lastMessageTime: "Ontem", unreadCount: 0, status: "offline", channel: "whatsapp", channels: ["whatsapp", "messenger"] },
  { id: "7", name: "Roberto Souza", phone: "+5571933221100", labels: ["2"], lastMessage: "Vou pensar e retorno na segunda", lastMessageTime: "Ontem", unreadCount: 0, status: "offline", channel: "messenger", channels: ["messenger"] },
  { id: "8", name: "Camila Rocha", phone: "+5581922110099", labels: ["4"], assignedTo: "Ana", lastMessage: "Preciso da segunda via do boleto", lastMessageTime: "18/02", unreadCount: 1, status: "offline", channel: "instagram", channels: ["instagram", "telegram"] },
];

export const mockMessages: Record<string, WhatsAppMessage[]> = {
  "1": [
    { id: "m1", contactId: "1", text: "Olá, boa tarde!", timestamp: "14:20", direction: "inbound", status: "read", type: "text", channel: "whatsapp" },
    { id: "m2", contactId: "1", text: "Boa tarde, João! Como posso ajudar?", timestamp: "14:22", direction: "outbound", status: "read", type: "text", channel: "whatsapp" },
    { id: "m3", contactId: "1", text: "Gostaria de saber sobre os planos de monitoramento", timestamp: "14:25", direction: "inbound", status: "read", type: "text", channel: "whatsapp" },
    { id: "m4", contactId: "1", text: "Claro! Temos 3 planos disponíveis:\n\n📌 Básico - R$49,90/mês\n📌 Profissional - R$99,90/mês\n📌 Empresarial - R$199,90/mês\n\nQual deles te interessa mais?", timestamp: "14:28", direction: "outbound", status: "read", type: "text", channel: "whatsapp" },
    { id: "m5", contactId: "1", text: "Boa tarde, gostaria de saber sobre os planos", timestamp: "14:32", direction: "inbound", status: "delivered", type: "text", channel: "whatsapp" },
    { id: "m6t", contactId: "1", text: "Vi sua mensagem no Telegram também!", timestamp: "14:35", direction: "inbound", status: "read", type: "text", channel: "telegram" },
  ],
  "2": [
    { id: "m2a", contactId: "2", text: "Oi, tudo bem?", timestamp: "13:30", direction: "inbound", status: "read", type: "text", channel: "messenger" },
    { id: "m2b", contactId: "2", text: "Tudo sim! Em que posso ajudar?", timestamp: "13:32", direction: "outbound", status: "read", type: "text", channel: "messenger" },
    { id: "m2c", contactId: "2", text: "Obrigada pela informação!", timestamp: "13:45", direction: "inbound", status: "read", type: "text", channel: "messenger" },
  ],
  "3": [
    { id: "m6", contactId: "3", text: "Bom dia!", timestamp: "11:50", direction: "inbound", status: "read", type: "text", channel: "whatsapp" },
    { id: "m7", contactId: "3", text: "Bom dia, Pedro! Tudo bem?", timestamp: "11:55", direction: "outbound", status: "read", type: "text", channel: "whatsapp" },
    { id: "m8", contactId: "3", text: "Tudo sim! Sobre aquela proposta que conversamos...", timestamp: "12:00", direction: "inbound", status: "read", type: "text", channel: "whatsapp" },
    { id: "m9", contactId: "3", text: "Sim! Consegui um desconto especial de 15% para fechar esta semana.", timestamp: "12:10", direction: "outbound", status: "read", type: "text", channel: "whatsapp" },
    { id: "m10", contactId: "3", text: "Posso agendar para amanhã?", timestamp: "12:20", direction: "inbound", status: "delivered", type: "text", channel: "whatsapp" },
  ],
  "4": [
    { id: "m4a", contactId: "4", text: "Olá, preciso de suporte", timestamp: "11:40", direction: "inbound", status: "read", type: "text", channel: "instagram" },
    { id: "m4b", contactId: "4", text: "Claro! O que está acontecendo?", timestamp: "11:42", direction: "outbound", status: "read", type: "text", channel: "instagram" },
    { id: "m4c", contactId: "4", text: "O sistema está apresentando um erro", timestamp: "11:50", direction: "inbound", status: "delivered", type: "text", channel: "instagram" },
  ],
  "5": [
    { id: "m11", contactId: "5", text: "Olá! Vi a propaganda de vocês no Instagram", timestamp: "10:10", direction: "inbound", status: "read", type: "text", channel: "telegram" },
    { id: "m12", contactId: "5", text: "Quais são os serviços oferecidos?", timestamp: "10:15", direction: "inbound", status: "read", type: "text", channel: "telegram" },
    { id: "m13", contactId: "5", text: "Podem me mandar mais informações?", timestamp: "10:20", direction: "inbound", status: "read", type: "text", channel: "telegram" },
    { id: "m14", contactId: "5", text: "Qual o valor mensal?", timestamp: "10:25", direction: "inbound", status: "read", type: "text", channel: "telegram" },
    { id: "m15", contactId: "5", text: "Vi a propaganda e tenho interesse", timestamp: "10:30", direction: "inbound", status: "delivered", type: "text", channel: "telegram" },
  ],
};
