
# Automação e Comunicação — Plano em 4 Ondas

O escopo enviado é enorme (9 seções + construtor visual de automações + simulador + logs). Impossível fazer tudo em um turno sem quebrar qualidade. Proponho **4 ondas incrementais**, cada uma revisável e utilizável sozinha. **Nenhuma quebra** ao que já existe: reaproveito `service_settings`, `service_holidays`, `chatbot_teams`, `whatsapp_templates`, `whatsapp_quick_replies`, `tenant_departments`, `crm_leads`, `crm_tags` etc. Tudo multi-tenant com RLS por `tenant_id` (`company_id`).

---

## Onda 1 — Fundação + Comportamento Automático + Mensagens + Horários (este turno)

**Migration:**
- `chatbot_communication_settings` (singleton por tenant + agent_id opcional): switches de resposta automática, novas/existentes, tempo antes de responder, agrupamento (janela + limite), limite de respostas seguidas, ação ao atingir limite, indicador de digitação, simulação, divisão de mensagens longas, config de emojis/áudio/imagem, pausa quando humano responde, regras de retomada da IA. JSONB para blocos complexos.
- `chatbot_message_templates` (mensagens automáticas): tipo (welcome, agent_intro, off_hours, unavailable, transfer_*, error, closing, inactivity_1, inactivity_2), texto, canais permitidos, mídia opcional, ativado, variáveis, versão padrão.
- `chatbot_business_hours` (7 dias, múltiplos intervalos, timezone, fora-do-horário behavior). Reaproveita `service_holidays` existente.
- `chatbot_inactivity_rules`: dois avisos + encerramento automático (tempos, mensagens, tags, status final).

Todas com GRANT + RLS por tenant, escrita restrita a Master/CEO/Admin.

**Frontend (`src/pages/ConfiguracoesAtendimento.tsx` aba "automacao"):**
Substituo os 3 cards estáticos atuais (Flow/Agendadas/Link) por header padrão + 8 sub-seções recolhíveis exatamente como pedido:
1. Comportamento automático — `AutomacaoComportamentoPanel.tsx`
2. Mensagens do atendimento — `AutomacaoMensagensPanel.tsx` (editor com variáveis, preview, teste)
3. Horários e disponibilidade — `AutomacaoHorariosPanel.tsx` (grade semanal + timezone; feriados via link para o painel existente)
4. Inatividade e encerramento — `AutomacaoInatividadePanel.tsx`
5. Atendimento humano — placeholder + link para configuração de Equipes (já existe)
6. Formatação das mensagens — controles vindos de `chatbot_communication_settings`
7. Automações personalizadas — placeholder "Em breve" nesta onda
8. Histórico e testes — placeholder "Em breve" nesta onda

Header da aba com **Status indicator** (Salvo/Alterando/Salvando/Erro) + botões **Testar atendimento** / **Descartar alterações** / **Salvar alterações** globais para os painéis que compartilham o mesmo registro singleton.

Hooks: `useCommunicationSettings`, `useMessageTemplates`, `useBusinessHours`, `useInactivityRules` — cada um com dirty-state, save, discard.

Variáveis (`{{nome_contato}}` etc.) validadas no editor com componente `<VariableInserter>`. Substituição real acontece no runtime da IA (Onda 4).

---

## Onda 2 — Atendimento humano + Formatação + integração de runtime

- Ligar `pause_ai_on_human_reply`, `resume_rules`, indicador de digitação, divisão de mensagens e simulação de digitação no runtime do agente (`accord-ai-chat` / Pulse).
- Ação "Devolver conversa para o agente de IA" no Inbox.
- Detecção de intenção "quero falar com humano" com transfer para equipe (usa `chatbot_teams` da onda anterior).

## Onda 3 — Automações personalizadas (construtor visual)

- Tabelas `chatbot_automations` + `chatbot_automation_triggers` + `..._conditions` + `..._actions` (JSONB de nós).
- Wizard de 6 etapas (Info → Gatilho → Condições → Ações → Exceções → Revisão).
- Construtor de condições com grupos E/OU (reusa `ConditionBuilder` que farei em recursos).
- 25+ gatilhos e 12+ tipos de ação (send_message, wait, branch, tag, update_contact, create_lead, create_task, transfer, pause_ai, close, notify, webhook).
- Reordenação por drag-and-drop com `priority`.

## Onda 4 — Simulador de atendimento + Histórico/Logs

- Modal "Testar atendimento" full-screen com painel de diagnóstico (mensagem recebida → gatilho → condições → automação → ação → resultado), opção "usar dados reais" com confirmação.
- Tabelas `chatbot_automation_executions` + `chatbot_automation_logs` com mascaramento de dados sensíveis, filtros por período/canal/status.
- Integração real com edge functions de resposta (`accord-ai-chat`, `pulse-agent-runtime`).

---

## Garantias transversais (todas as ondas)

- **RLS**: `tenant_id = get_user_company_id(auth.uid()) OR is_master(auth.uid())`. Escrita só para roles `admin`/`ceo`/`master` via `has_role`.
- **Auditoria**: usa `audit_logs` existente (todos os saves gravam evento com diff).
- **Sem quebra**: `AccordStack`, `Flow Builder`, `Usuarios.tsx`, `AccordFeedPremium`, `accord-ai-chat`, `Pulse*` intocados até a Onda 2 (quando integro runtime — só adiciono leitura, sem remover).
- **TypeScript** sem `any`. Console limpo.
- **Responsivo** — accordions viram cards empilhados em mobile (padrão do projeto).

---

## Confirma que começo pela **Onda 1** neste turno?

Migration + 4 painéis funcionais (Comportamento, Mensagens, Horários, Inatividade) + header com Salvar/Descartar/Testar + placeholders para 5–8. Ondas 2–4 vêm em turnos seguintes. Cada onda entrega sozinha valor sem quebrar nada.
