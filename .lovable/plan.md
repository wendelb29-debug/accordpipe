## Escopo

Transformar a aba **Equipe e Recursos** dentro de `/configuracoes/atendimento` (arquivo `src/pages/ConfiguracoesAtendimento.tsx`) num módulo real de configuração do agente/chatbot Accord, no espírito da referência EZ Chat (`/configuration?tab=tools`). Preservo layout global, rotas, tema, sidebar, header e as demais abas.

Como o pedido cobre 14 tipos de recursos, construtor de condições, simuladores de teste, logs de execução, RLS, auditoria e reordenação — é grande demais para um único turno estável. Vou entregar em **4 ondas**, cada uma revisável e funcional isoladamente.

---

## Onda 1 — Fundação de dados + Aba redesenhada + Equipes (CRUD real)

**Backend (1 migration):**
- `chatbot_teams` (nome, descrição, cor, ícone, departamento_id, status, prioridade, horário JSON, canais[], limite simultâneo, mensagem fora do expediente, equipe_fallback_id, tenant_id).
- `chatbot_team_members` (team_id, user_id, papel: responsável/supervisor/atendente).
- `chatbot_team_rules` (team_id, palavras-chave[], intenções[], tags[], modo transferência, mensagens antes/depois, ação fallback).
- Reaproveita `profiles`, `user_tenants`, `tenant_departments`, `whatsapp_labels` (tags), `service_settings` (horário base).
- GRANT + RLS por tenant, política de escrita para admin/CEO/master, auditoria via `audit_logs`.

**Frontend:**
- Reescrevo o conteúdo do tab `equipe` em `ConfiguracoesAtendimento.tsx` com o novo header (título + descrição + botões `Adicionar equipe` / `Adicionar recurso`) e as duas seções (Equipes / Recursos).
- Lista de equipes em cards com todos os campos pedidos (contadores, status online real via `useOnlineUsers`, prioridade drag-drop com `@dnd-kit`).
- Filtros (status/canal/departamento/disponibilidade) e ordenação.
- Modal wizard `TeamFormDialog.tsx` com 5 etapas (Básico → Participantes → Disponibilidade → Regras → Revisão), validação Zod, salvar-rascunho.
- Ações: ativar/desativar, editar, duplicar, excluir, ver membros.

**Não faço nesta onda:** simulador de transferência, integração real do chatbot com essas equipes (isso entra na Onda 4).

---

## Onda 2 — Recursos do agente (CRUD + condições + reordenação)

**Backend:**
- `chatbot_resources` (tipo enum dos 14, nome, descrição p/ IA, config jsonb, gatilhos jsonb, condições jsonb, prioridade, status, canais[], limite, fallback_resource_id, tenant_id).
- `chatbot_resource_executions` (resource_id, conversation_id, contact_id, payload/response mascarados, status, duração, tentativas, erro).

**Frontend:**
- Grid de recursos com card por tipo (14 tipos com ícone/cor próprios).
- `ResourceFormDialog.tsx` polimórfico: renderiza subformulário conforme tipo (transferir equipe / atribuir atendente / tag / lead CRM / oportunidade / atualizar contato / atividade / agendar / mensagem / solicitar info / consultar / webhook / encerrar / chamar IA).
- **Construtor visual de condições** reutilizável (`ConditionBuilder.tsx`) com grupos E/OU, operadores, campos do contexto (canal, equipe, horário, tag, intenção, campo do contato, status/pipeline, autenticação, inatividade).
- Reordenação por drag-drop, ativar/desativar, duplicar, excluir.

---

## Onda 3 — Simuladores + Histórico + Auditoria

- Modal `TransferTestDialog.tsx` (equipe): simula canal/contato/motivo/horário/mensagem → mostra elegibilidade, atendente escolhido, regra aplicada, mensagens, fallback. Não cria atendimento real.
- Modal `ResourceTestDialog.tsx`: preenche dados de exemplo, mostra payload/resposta/tempo/status/fallback. Toggle "executar com dados reais" (default off).
- Aba/gaveta de logs por recurso lendo `chatbot_resource_executions`, com filtros, busca, mascaramento de campos sensíveis (webhook headers, tokens).
- Registro em `audit_logs` para toda mutação de equipe/recurso.

---

## Onda 4 — Execução real no chatbot

- Edge function `chatbot-transfer` (usa o snapshot de equipes + regras para roteamento real: intenção → validar ativa/horário/canais/atendentes → aplicar prioridade e distribuição rodízio/menor-fila/manual → preservar histórico → notificar cliente e atendente → registrar em `chatbot_transfer_history`).
- Edge function `chatbot-run-resource` (executa o recurso conforme tipo, respeitando confirmação/limite/fallback, mascara secrets, grava execução).
- Integração com o loop atual do agente (`accord-ai-chat` ou onde a decisão de resposta é tomada) — apenas invoca `chatbot-run-resource` quando a IA escolhe uma ferramenta, sem alterar prompts existentes fora do necessário.

---

## Garantias

- Não toco em: `Sidebar.tsx`, `Header.tsx`, `AppLayout.tsx`, `App.tsx` (rotas), tema, outras abas (`Atendimento`, `Automação`, `Sistema`), `AccordStack`, `Usuarios.tsx`, CRM, edge functions existentes fora da Onda 4.
- Reaproveito `profiles`/`user_tenants`/`tenant_departments`/`whatsapp_labels`/`whatsapp_quick_replies`/`crm_leads`/`kanban_columns`/`workspaces`/`service_settings` — nada é duplicado.
- Todas as mutações são reais no Supabase, com RLS multi-tenant, GRANTs explícitos e auditoria; nada de mock ou botão ilustrativo.
- Responsivo em desktop/tablet/mobile, estados loading/vazio/erro/sem-permissão implementados.

---

## Como quero prosseguir

Confirma que posso começar pela **Onda 1** (migration + redesign da aba + CRUD real de Equipes) neste turno? As Ondas 2–4 entram em turnos seguintes para manter cada entrega revisável — cada onda é utilizável isoladamente sem quebrar o que já existe.
