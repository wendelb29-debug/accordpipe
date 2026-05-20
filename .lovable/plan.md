# Accord Pulse — Negociação ao vivo (chat IA em tempo real)

Evoluir o módulo Accord Pulse para uma central de negociação assistida por IA, com chat em tempo real, configuração avançada do agente e base de conhecimento por campanha.

## 1. Banco de dados (migração)

**Alterar `pulse_agent_settings`** — garantir todos os campos solicitados (`starts_at`, `ends_at`, `max_messages_per_lead`, `max_negotiation_days`, `auto_pause_on_end_date`, `auto_reply_inbound`, `auto_start_conversations`, `require_approval_first_message`, `require_approval_sensitive_objection`, `block_outside_window`, `tone`, etc.).

**Alterar `pulse_outbound_leads`** — adicionar: `ai_typing`, `last_objection`, `internal_ai_note`, `next_goal`, `last_ai_recommendation`, `negotiation_started_at`, `negotiation_ends_at`, `manual_takeover_by`, `manual_takeover_at` (os outros já existem).

**Nova `pulse_knowledge_base`** — campanha, título, tipo (texto/faq/oferta/objecoes/politica/case/script), conteúdo, prioridade, ativo. RLS por servidor_id via campanha.

**Alterar `whatsapp_messages`** — adicionar `pulse_source` (`ai`/`operator`/`null`), `pulse_lead_id`, `pulse_campaign_id`, `ai_generated`.

**`pulse_agent_events`** já existe — garantir campos `ai_reasoning`, `detected_intent`, `detected_objection`, `detected_sentiment`, `next_goal`.

**Realtime** — adicionar `whatsapp_messages`, `pulse_outbound_leads`, `pulse_agent_events` ao `supabase_realtime`.

## 2. Edge function `accord-pulse-agent`

Estender com 4 actions:
- `classify_inbound` — classifica msg do lead (intent/objeção/sentimento), atualiza resumo, decide `needs_human` e `should_auto_reply`.
- `generate_reply` — gera próxima mensagem usando knowledge base + histórico + nota interna; pode marcar `should_send`.
- `generate_suggestion` — igual mas nunca envia, só retorna preview.
- `run_due_leads` — varre leads `next_action_at <= now()`, valida janela/dias/timezone/limites, envia via `whatsapp-send`, marca `pulse_source=ai`.

Lovable AI Gateway (`google/gemini-2.5-flash`), system prompt com tom + materiais de apoio ativos ordenados por prioridade, instrução "nunca dizer que é IA, nunca inventar fora da base".

## 3. Webhook inbound

Em `whatsapp-webhook`, após salvar mensagem inbound:
1. Buscar `pulse_outbound_leads` ativo pelo `contact_id`/phone.
2. Se `settings.auto_reply_inbound`, setar `ai_typing=true`, chamar `classify_inbound`.
3. Aplicar delay aleatório, setar `next_action_at`. Cron processa.

## 4. Frontend — `src/pages/AccordPulse.tsx`

Adicionar 2 novas abas mantendo as atuais:

### Aba "Negociação ao vivo" (`PulseLiveChatTab.tsx`)
3 colunas (stack em mobile):
- **Esquerda**: lista filtrável de leads em negociação (status, temperatura, última msg, badge "precisa humano", indicador "digitando").
- **Centro**: chat estilo WhatsApp inbox. Header com nome/status/temperatura + botões (Pausar IA, Retomar, Assumir, Marcar reunião, Marcar perdido). Mensagens com badge IA/Operador, status de entrega, horário, auto-scroll. Footer com input manual, toggle "IA auto-responde", botão "Gerar sugestão" (preview editável antes de enviar). Estados ao vivo: "IA analisando", "IA preparando próxima mensagem", "Próxima ação em Xmin", "Pausado", "Precisa humano".
- **Direita**: contexto — resumo, intenção, objeção, sentimento, última recomendação, próximo objetivo, dados do lead, botão editar contexto, textarea "Nota interna para IA".

Realtime via `supabase.channel` em `whatsapp_messages` (filtrado por contato), `pulse_outbound_leads` (id do lead), `pulse_agent_events` (campaign).

### Aba "Configuração do agente" (estender `PulseAgentSettingsTab.tsx`)
Form completo com seções: Período (datas/horários/dias/timezone/delays/limites), Comportamento (todos os switches), e seção **Base de conhecimento** (CRUD inline de `pulse_knowledge_base` por campanha — adicionar/editar/ativar materiais por tipo).

## 5. Stack técnica

- shadcn/ui (Tabs, Card, Button, ScrollArea, Badge, Switch, Textarea, Select, Dialog), lucide-react.
- Realtime Supabase, sem polling.
- Mantém visual dark Accord, responsivo.

## Notas

- Cron `run_due_leads` já configurado anteriormente — apenas estendido.
- Sem landing page, sem mudanças em outras telas.
- Build precisa passar.
