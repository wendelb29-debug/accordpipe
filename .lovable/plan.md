# Accord Pulse — Agente Autônomo de Negociação

Transformar o módulo Accord Pulse em um agente IA que importa leads via planilha, negocia sozinho no WhatsApp dentro de guardrails configuráveis, classifica respostas inbound e tenta agendar reuniões.

## 1. Banco de dados (migração Supabase)

**Nova tabela `pulse_agent_settings`** (1 por campanha):
- Toggle `enabled`, `daily_limit`, janela `send_window_start/end`, `send_weekdays`
- `min_delay_minutes`, `max_delay_minutes`, `max_attempts_per_lead`
- Flags `stop_on_opt_out`, `stop_on_human_request`, `stop_on_meeting`
- Textos: `playbook`, `known_objections`, `main_offer`, `scheduling_instructions`, `tone`
- RLS por `servidor_id` (via campanha) com roles admin/ceo/comercial

**Alterar `pulse_outbound_leads`** — novas colunas:
`auto_enabled`, `intent`, `sentiment`, `messages_sent`, `max_attempts`, `next_action_type`, `needs_human`, `opt_out`, `last_inbound_at`, `last_outbound_at`, `conversation_summary`, `next_action_at`

**Nova tabela `pulse_agent_events`**: log de cada decisão da IA (event_type, direction, message, reasoning, intent, objection, metadata).

**Novos status** em `pulse_outbound_leads.status`: `aguardando_inicio`, `em_cadencia`, `respondeu`, `negociando`, `objecao`, `agendar`, `reuniao_marcada`, `ganho`, `perdido`, `pausado`, `precisa_humano`, `opt_out`.

## 2. Edge Function `accord-pulse-agent` (evolução)

Três ações via `action` no body:

- **`generate_next_message`** — IA gera próxima mensagem WhatsApp consultiva e curta, devolve `{message, intent, next_stage, temperature, should_send, needs_human, stop_reason, reasoning}`. Aplica guardrails do playbook.
- **`classify_inbound`** — classifica resposta do lead em intent/sentiment/objection, devolve update de status e flags (`opt_out`, `meeting_requested`, `needs_human`).
- **`run_due_leads`** — varredura: para cada campanha com agente ativo, dentro da janela e dia da semana, busca leads elegíveis (`auto_enabled`, sem opt_out, `next_action_at <= now()`, abaixo do `daily_limit` e `max_attempts`), gera próxima mensagem, envia via `whatsapp-send`, atualiza lead + insere evento. Respeita delay aleatório humano.

Usa Lovable AI Gateway (`google/gemini-2.5-flash`) com fallback local.

## 3. Webhook inbound (integração)

Atualizar `whatsapp-webhook` para, ao receber mensagem inbound, detectar se há `pulse_outbound_lead` ativo para o contato e chamar `classify_inbound`. Atualiza lead, agenda próxima resposta com delay humano, marca `needs_human` ou `opt_out` quando aplicável.

## 4. Cron scheduler

Configurar `pg_cron` (5 min) chamando `run_due_leads` da edge function via `pg_net`.

## 5. Frontend (`src/pages/AccordPulse.tsx`)

Nova estrutura em 4 abas dentro da campanha selecionada:

### Aba "Importar leads"
- Upload `.xlsx/.xls/.csv` usando `xlsx`
- Mapeamento flexível de colunas (empresa/contato/telefone/email/origem/observações/motivo_perda/cidade/estado/valor_mrr)
- Preview com tabela paginada
- Seleção de campanha destino
- Validação: telefone obrigatório
- Ao confirmar: cria/reutiliza `crm_leads` (source = "Accord Pulse Import"), cria `pulse_outbound_leads`, cria `whatsapp_contacts` quando possível
- Resultado: importados / ignorados / com erro

### Aba "Agente IA"
Formulário de configuração `pulse_agent_settings` por campanha com todos os campos descritos.

### Aba "Fila outbound" (evoluída)
Cards/linhas mostrando: temperatura, intent, última objeção, próxima ação, próxima mensagem, último contato, total enviadas, badge auto/pausado.
Ações por lead: pausar/retomar automático, assumir conversa, marcar reunião, marcar perdido, abrir no inbox WhatsApp.

### Aba "Leads descartados"
Mantida (já existe).

## 6. Detalhes técnicos

- Frontend usa shadcn/ui + lucide-react, tema dark Accord
- Cliente Supabase existente `@/integrations/supabase/client`
- `xlsx` já no projeto
- Guardrails: limite diário por campanha, janela de envio respeitada, delays humanos, opt_out permanente, nunca mais de 1 mensagem por execução por lead
- Operador sempre pode pausar via toggle por lead ou pelo `enabled` da campanha

## 7. Arquivos a criar/editar

```text
supabase/migrations/<timestamp>_pulse_agent.sql    (novo)
supabase/functions/accord-pulse-agent/index.ts     (reescrito com 3 actions)
supabase/functions/whatsapp-webhook/index.ts       (hook inbound -> classify)
src/pages/AccordPulse.tsx                          (refatorado com 4 abas)
src/components/pulse/PulseImportTab.tsx            (novo)
src/components/pulse/PulseAgentSettingsTab.tsx     (novo)
src/components/pulse/PulseQueueTab.tsx             (novo)
src/components/pulse/PulseLeadActions.tsx          (novo)
```

Cron `pg_cron` configurado via `supabase--insert` após deploy da função.

## Confirmação

Posso seguir com a migração de banco primeiro (que requer sua aprovação), depois implementar edge function e frontend?