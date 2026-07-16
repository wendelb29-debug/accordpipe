import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TemplateType =
  | "welcome" | "agent_intro" | "off_hours" | "unavailable"
  | "transfer_started" | "transfer_completed" | "transfer_no_agent"
  | "transfer_waiting" | "transfer_taken" | "transfer_returned"
  | "error" | "closing" | "inactivity_1" | "inactivity_2";

export interface CommunicationSettings {
  id?: string;
  tenant_id?: string;
  agent_id?: string | null;
  auto_reply_enabled: boolean;
  reply_new_conversations: boolean;
  reply_existing_conversations: boolean;
  reply_delay_seconds: number;
  message_grouping_enabled: boolean;
  message_grouping_window_seconds: number;
  max_consecutive_replies: number;
  max_data_retry_attempts: number;
  max_messages_before_handoff: number;
  on_limit_reached: "transfer" | "request_human" | "create_task" | "wait" | "close";
  show_typing_indicator: boolean;
  typing_simulation: "none" | "fixed" | "proportional" | "random";
  typing_min_ms: number;
  typing_max_ms: number;
  split_long_messages: boolean;
  split_max_chars: number;
  split_interval_ms: number;
  split_max_blocks: number;
  emoji_policy: "none" | "moderate" | "contextual" | "free";
  max_emojis_per_message: number;
  audio_transcribe_incoming: boolean;
  audio_reply_enabled: boolean;
  audio_voice: string | null;
  image_analysis_enabled: boolean;
  document_analysis_enabled: boolean;
  pause_ai_on_human_reply: boolean;
  resume_ai_mode: "never" | "after_timeout" | "manual" | "on_stage" | "on_tag";
  resume_ai_after_minutes: number | null;
  transfer_intent_phrases: string[];
}

const DEFAULT_SETTINGS: CommunicationSettings = {
  auto_reply_enabled: true,
  reply_new_conversations: true,
  reply_existing_conversations: true,
  reply_delay_seconds: 0,
  message_grouping_enabled: true,
  message_grouping_window_seconds: 5,
  max_consecutive_replies: 5,
  max_data_retry_attempts: 3,
  max_messages_before_handoff: 10,
  on_limit_reached: "transfer",
  show_typing_indicator: true,
  typing_simulation: "proportional",
  typing_min_ms: 800,
  typing_max_ms: 3500,
  split_long_messages: true,
  split_max_chars: 400,
  split_interval_ms: 800,
  split_max_blocks: 4,
  emoji_policy: "moderate",
  max_emojis_per_message: 2,
  audio_transcribe_incoming: true,
  audio_reply_enabled: false,
  audio_voice: null,
  image_analysis_enabled: true,
  document_analysis_enabled: true,
  pause_ai_on_human_reply: true,
  resume_ai_mode: "manual",
  resume_ai_after_minutes: null,
  transfer_intent_phrases: [
    "quero falar com uma pessoa",
    "quero falar com atendente",
    "atendimento humano",
    "falar com suporte",
    "falar com vendedor",
    "não quero falar com robô",
  ],
};

export function useCommunicationSettings() {
  const { user, profile } = useAuth();
  const tenantId = profile?.company_id;
  const [settings, setSettings] = useState<CommunicationSettings>(DEFAULT_SETTINGS);
  const [initial, setInitial] = useState<CommunicationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("chatbot_communication_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("agent_id", null)
      .maybeSingle();
    if (error) {
      console.error("[useCommunicationSettings] load", error);
      toast.error("Erro ao carregar configurações");
    }
    const rec = (data as any) ?? { tenant_id: tenantId, ...DEFAULT_SETTINGS };
    setSettings(rec);
    setInitial(rec);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(settings) !== JSON.stringify(initial);

  const save = async () => {
    if (!tenantId) return;
    setSaving(true);
    const payload = {
      ...settings,
      tenant_id: tenantId,
      agent_id: null,
      updated_by: user?.id ?? null,
      created_by: settings.id ? undefined : user?.id ?? null,
    };
    const { data, error } = await supabase
      .from("chatbot_communication_settings")
      .upsert(payload as any, { onConflict: "tenant_id,agent_id" })
      .select()
      .maybeSingle();
    setSaving(false);
    if (error) {
      console.error("[useCommunicationSettings] save", error);
      toast.error("Erro ao salvar configurações");
      return false;
    }
    if (data) {
      setSettings(data as any);
      setInitial(data as any);
    }
    toast.success("Configurações salvas");
    return true;
  };

  const discard = () => setSettings(initial);

  return { settings, setSettings, initial, loading, saving, dirty, save, discard, reload: load };
}

// ---------- Message templates ----------
export interface MessageTemplate {
  id?: string;
  tenant_id?: string;
  agent_id?: string | null;
  template_type: TemplateType;
  enabled: boolean;
  content: string;
  channels: string[];
  media_url: string | null;
  media_type: string | null;
  extra_config: Record<string, any>;
}

export const TEMPLATE_LABELS: Record<TemplateType, { label: string; desc: string; defaultText: string }> = {
  welcome: { label: "Boas-vindas", desc: "Enviada no primeiro contato", defaultText: "Olá {{primeiro_nome}}! 👋 Seja bem-vindo(a) à {{empresa}}. Como posso te ajudar hoje?" },
  agent_intro: { label: "Apresentação do agente", desc: "Apresentação do assistente virtual", defaultText: "Sou o {{nome_agente}}, assistente virtual da {{empresa}}. Estou aqui para te ajudar." },
  off_hours: { label: "Fora do horário", desc: "Enviada fora do horário de atendimento", defaultText: "Nosso atendimento está fora do horário. Retornaremos assim que possível. Deixe sua mensagem que responderemos em breve." },
  unavailable: { label: "Indisponibilidade", desc: "Quando o serviço/agente está indisponível", defaultText: "No momento não conseguimos processar sua solicitação. Tente novamente em instantes." },
  transfer_started: { label: "Transferência iniciada", desc: "Ao iniciar transferência para humano", defaultText: "Vou te transferir para um de nossos atendentes. Só um momento…" },
  transfer_completed: { label: "Transferência concluída", desc: "Quando o atendente assumir", defaultText: "{{nome_atendente}} entrou na conversa e vai continuar seu atendimento." },
  transfer_no_agent: { label: "Nenhum atendente disponível", desc: "Fallback sem atendente", defaultText: "No momento nenhum atendente está disponível. Sua mensagem foi registrada e retornaremos em breve." },
  transfer_waiting: { label: "Aguardando atendente", desc: "Cliente aguardando", defaultText: "Você está na fila. Em breve um atendente vai continuar sua conversa." },
  transfer_taken: { label: "Atendimento assumido", desc: "Humano assumiu", defaultText: "Um atendente humano está cuidando do seu atendimento agora." },
  transfer_returned: { label: "Devolvido para IA", desc: "Voltou para o agente virtual", defaultText: "Estou de volta! Como posso continuar te ajudando?" },
  error: { label: "Erro", desc: "Falha ao processar solicitação", defaultText: "Tive um problema ao processar sua solicitação. Pode repetir, por favor?" },
  closing: { label: "Encerramento", desc: "Despedida", defaultText: "Foi um prazer te atender! Protocolo: {{protocolo}}. Até logo!" },
  inactivity_1: { label: "1º aviso de inatividade", desc: "Primeiro aviso após inatividade", defaultText: "Você ainda está aí? Posso ajudar com mais alguma coisa?" },
  inactivity_2: { label: "2º aviso de inatividade", desc: "Segundo aviso antes de encerrar", defaultText: "Como não tivemos retorno, seu atendimento será encerrado em breve." },
};

export const ALL_TEMPLATE_TYPES: TemplateType[] = Object.keys(TEMPLATE_LABELS) as TemplateType[];

export function useMessageTemplates() {
  const { user, profile } = useAuth();
  const tenantId = profile?.company_id;
  const [templates, setTemplates] = useState<Record<TemplateType, MessageTemplate>>({} as any);
  const [initial, setInitial] = useState<Record<TemplateType, MessageTemplate>>({} as any);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("chatbot_message_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("agent_id", null);
    if (error) console.error("[useMessageTemplates] load", error);
    const map: Record<TemplateType, MessageTemplate> = {} as any;
    for (const t of ALL_TEMPLATE_TYPES) {
      const rec = (data ?? []).find((r: any) => r.template_type === t);
      map[t] = rec ? (rec as any) : {
        tenant_id: tenantId,
        agent_id: null,
        template_type: t,
        enabled: true,
        content: TEMPLATE_LABELS[t].defaultText,
        channels: ["whatsapp", "instagram", "messenger", "webchat"],
        media_url: null,
        media_type: null,
        extra_config: {},
      };
    }
    setTemplates(map);
    setInitial(JSON.parse(JSON.stringify(map)));
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(templates) !== JSON.stringify(initial);

  const update = (type: TemplateType, patch: Partial<MessageTemplate>) =>
    setTemplates((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }));

  const restoreDefault = (type: TemplateType) =>
    update(type, { content: TEMPLATE_LABELS[type].defaultText });

  const save = async () => {
    if (!tenantId) return false;
    setSaving(true);
    const rows = ALL_TEMPLATE_TYPES.map((t) => ({
      ...templates[t],
      tenant_id: tenantId,
      agent_id: null,
      updated_by: user?.id ?? null,
      created_by: templates[t].id ? undefined : user?.id ?? null,
    }));
    const { error } = await supabase
      .from("chatbot_message_templates")
      .upsert(rows as any, { onConflict: "tenant_id,agent_id,template_type" });
    setSaving(false);
    if (error) {
      console.error("[useMessageTemplates] save", error);
      toast.error("Erro ao salvar mensagens");
      return false;
    }
    toast.success("Mensagens salvas");
    await load();
    return true;
  };

  const discard = () => setTemplates(JSON.parse(JSON.stringify(initial)));

  return { templates, update, restoreDefault, loading, saving, dirty, save, discard };
}

// ---------- Business hours ----------
export interface DaySchedule {
  enabled: boolean;
  all_day: boolean;
  intervals: { start: string; end: string }[];
}
export interface BusinessHours {
  id?: string;
  tenant_id?: string;
  timezone: string;
  weekly_schedule: DaySchedule[];
  off_hours_behavior: "ai_replies" | "ai_simple_only" | "collect_data" | "inform_and_close" | "create_callback" | "forward_to_oncall" | "no_reply";
}

const DEFAULT_HOURS: BusinessHours = {
  timezone: "America/Sao_Paulo",
  weekly_schedule: [
    { enabled: false, all_day: false, intervals: [] },
    { enabled: true, all_day: false, intervals: [{ start: "09:00", end: "18:00" }] },
    { enabled: true, all_day: false, intervals: [{ start: "09:00", end: "18:00" }] },
    { enabled: true, all_day: false, intervals: [{ start: "09:00", end: "18:00" }] },
    { enabled: true, all_day: false, intervals: [{ start: "09:00", end: "18:00" }] },
    { enabled: true, all_day: false, intervals: [{ start: "09:00", end: "18:00" }] },
    { enabled: false, all_day: false, intervals: [] },
  ],
  off_hours_behavior: "ai_replies",
};

export function useBusinessHours() {
  const { user, profile } = useAuth();
  const tenantId = profile?.company_id;
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [initial, setInitial] = useState<BusinessHours>(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("chatbot_business_hours")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("agent_id", null)
      .maybeSingle();
    const rec = (data as any) ?? { tenant_id: tenantId, ...DEFAULT_HOURS };
    setHours(rec);
    setInitial(rec);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(hours) !== JSON.stringify(initial);

  const save = async () => {
    if (!tenantId) return false;
    setSaving(true);
    const { error } = await supabase
      .from("chatbot_business_hours")
      .upsert({
        ...hours,
        tenant_id: tenantId,
        agent_id: null,
        updated_by: user?.id ?? null,
        created_by: hours.id ? undefined : user?.id ?? null,
      } as any, { onConflict: "tenant_id,agent_id" });
    setSaving(false);
    if (error) {
      console.error("[useBusinessHours] save", error);
      toast.error("Erro ao salvar horários");
      return false;
    }
    toast.success("Horários salvos");
    await load();
    return true;
  };

  const discard = () => setHours(initial);

  return { hours, setHours, loading, saving, dirty, save, discard };
}

// ---------- Inactivity rules ----------
export interface InactivityRules {
  id?: string;
  tenant_id?: string;
  first_warning_enabled: boolean;
  first_warning_after_minutes: number;
  first_warning_message: string;
  second_warning_enabled: boolean;
  second_warning_after_minutes: number;
  second_warning_message: string;
  auto_close_enabled: boolean;
  auto_close_after_minutes: number;
  close_message: string;
  close_final_status: string;
  close_tag: string | null;
  reopen_on_new_message: boolean;
  create_summary: boolean;
  create_followup_task: boolean;
}

const DEFAULT_INACT: InactivityRules = {
  first_warning_enabled: true,
  first_warning_after_minutes: 10,
  first_warning_message: "Olá! Você ainda está aí? Posso ajudar com mais alguma coisa?",
  second_warning_enabled: true,
  second_warning_after_minutes: 20,
  second_warning_message: "Como não tivemos retorno, seu atendimento será encerrado em breve.",
  auto_close_enabled: true,
  auto_close_after_minutes: 45,
  close_message: "Atendimento encerrado por inatividade. Se precisar, é só chamar novamente.",
  close_final_status: "closed",
  close_tag: null,
  reopen_on_new_message: true,
  create_summary: true,
  create_followup_task: false,
};

export function useInactivityRules() {
  const { user, profile } = useAuth();
  const tenantId = profile?.company_id;
  const [rules, setRules] = useState<InactivityRules>(DEFAULT_INACT);
  const [initial, setInitial] = useState<InactivityRules>(DEFAULT_INACT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("chatbot_inactivity_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("agent_id", null)
      .maybeSingle();
    const rec = (data as any) ?? { tenant_id: tenantId, ...DEFAULT_INACT };
    setRules(rec);
    setInitial(rec);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(rules) !== JSON.stringify(initial);

  const save = async () => {
    if (!tenantId) return false;
    setSaving(true);
    const { error } = await supabase
      .from("chatbot_inactivity_rules")
      .upsert({
        ...rules,
        tenant_id: tenantId,
        agent_id: null,
        updated_by: user?.id ?? null,
        created_by: rules.id ? undefined : user?.id ?? null,
      } as any, { onConflict: "tenant_id,agent_id" });
    setSaving(false);
    if (error) {
      console.error("[useInactivityRules] save", error);
      toast.error("Erro ao salvar regras de inatividade");
      return false;
    }
    toast.success("Regras de inatividade salvas");
    await load();
    return true;
  };

  const discard = () => setRules(initial);

  return { rules, setRules, loading, saving, dirty, save, discard };
}

export const AVAILABLE_VARIABLES = [
  "{{nome_contato}}", "{{primeiro_nome}}", "{{empresa}}",
  "{{nome_agente}}", "{{nome_atendente}}", "{{nome_equipe}}",
  "{{data_atual}}", "{{hora_atual}}", "{{protocolo}}",
  "{{numero_pedido}}", "{{responsavel_comercial}}",
  "{{link_agendamento}}", "{{link_pagamento}}", "{{canal}}",
];
