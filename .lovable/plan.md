# Plano — Reconstrução da aba "Equipe e Recursos"

A aba já existe em `src/pages/ConfiguracoesAtendimento.tsx` (tab `equipe`). A Onda 1 anterior entregou `chatbot_teams` + `ChatbotTeamsPanel` (CRUD com wizard). Este plano finaliza a aba no padrão EZ com **transferência real, recursos do agente, testes, histórico, RLS e auditoria**, dividido em **5 ondas revisáveis** — cada onda é útil isoladamente e não quebra o que já existe.

Não é possível entregar tudo (26 tipos de campo, 17 tipos de recurso, construtor de condições, simuladores, realtime, histórico mascarado, RLS, auditoria, responsividade) em um único turno sem produzir código instável. Peço aprovação onda a onda.

## Escopo por onda

### Onda 1 — Layout EZ + Bloco "Transferência para equipe" (este turno, se aprovado)
- Refazer o conteúdo da tab `equipe` em `ConfiguracoesAtendimento.tsx` com o shell EZ:
  cabeçalho (título + descrição), barra sticky com "Alterações salvas / Descartar / Salvar alterações" e prompt de confirmação ao sair com dirty state.
- Componente `TransferenciaEquipePanel`:
  - switch mestre "Permitir transferência" (persistido em `chatbot_communication_settings.transfer_enabled`).
  - `MultiSelect` de equipes reais (`chatbot_teams`) com busca, contador de membros, status.
  - Lista de cards das equipes selecionadas, com **drag-and-drop de prioridade** (`@dnd-kit/core` já usado no projeto), switch on/off por equipe, botão config, botão remover.
- Nova tabela `chatbot_agent_teams` (agent_id, team_id, position, is_enabled, config jsonb) + RLS + GRANT + auditoria via `audit_logs`.

### Onda 2 — Configuração individual + fallback + testar transferência
- Painel lateral (Sheet) por equipe replicando a EZ:
  orientação para IA, tags de assuntos, canais permitidos, modo de transferência (4 opções), mensagens (antes/durante/indisponível), ação de fallback (7 opções), equipe alternativa (com bloqueio de ciclo), prioridade, disponibilidade, limite de espera.
- Modal "Testar transferência" (simulação em modo seguro; toggle "dados reais" com dupla confirmação).
- Método de distribuição (7 opções) + verificações pré-transferência.

### Onda 3 — Bloco "Recursos do agente" (CRUD + 6 tipos essenciais)
- Tabelas `chatbot_resources`, `chatbot_resource_conditions`, `chatbot_resource_parameters` + RLS + GRANT.
- `RecursosAgentePanel`: lista drag-and-drop, empty state, cards com switch/menu (editar/testar/duplicar/histórico/excluir), botão "Adicionar recurso".
- Modal "Adicionar recurso" — Etapa 1 (17 tipos em cards) + Etapa 2 (form polimórfico).
- **Formulários funcionais para 6 tipos prioritários**: Transferir para equipe, Adicionar/Remover tag, Criar lead, Criar oportunidade, Criar tarefa, Encerrar atendimento.
- Construtor visual de condições (`ConditionBuilder`) com 16 campos, 13 operadores, grupos E/OU.

### Onda 4 — Tipos restantes + webhook + histórico + edge functions
- 11 tipos restantes: Atribuir atendente, Atualizar contato, Atualizar oportunidade, Agendar compromisso, Enviar notificação, Consultar dados, Executar webhook, Enviar documento, Solicitar informação, Executar recurso personalizado.
- Recurso Webhook com credenciais mascaradas (armazenadas em `secrets`), variáveis `{{...}}`, retries.
- Tabela `chatbot_resource_executions` + `chatbot_transfer_history`.
- Modal "Testar recurso" (10 etapas de resultado) + modal "Histórico" com máscara de tokens/PII.
- Edge functions `chatbot-execute-resource` e `chatbot-transfer-team` (execução real com validação de permissão, auditoria, timeout, fallback).

### Onda 5 — Runtime da IA + realtime + responsividade + a11y
- Integração no `accord-ai-chat`: expor recursos como tools do modelo, aplicar pausa da IA no transfer, gerar resumo para atendente, preservar histórico, atualizar tela via realtime.
- Realtime subscriptions em `chatbot_agent_teams`/`chatbot_resources`.
- Refino responsivo (tablet/mobile empilhado, sheets fullscreen no mobile).
- Auditoria completa em `audit_logs` para todas as mutações.
- Passe de a11y (labels, foco em modais, navegação por teclado).

## Detalhes técnicos

**Reuso confirmado:**
- `chatbot_teams` (existente, criada na Onda anterior) — sem duplicação.
- `chatbot_communication_settings` (Onda anterior) recebe `transfer_enabled`, `transfer_default_priority`.
- `EntityCombobox`, `Sheet`, `Dialog`, `@dnd-kit`, `useAuth` — todos já no projeto.

**Novas tabelas** (public, com GRANT + RLS por `company_id` via `get_user_company_id(auth.uid())`, políticas separadas para SELECT (membros do tenant) e INSERT/UPDATE/DELETE (Master/CEO/Admin)):
```
chatbot_agent_teams
chatbot_resources
chatbot_resource_conditions
chatbot_resource_parameters
chatbot_resource_executions
chatbot_transfer_history
```

**Não serão criadas** (já existem equivalentes):
- `chatbot_team_members`, `chatbot_team_schedules`, `chatbot_team_rules` — já criadas na Onda anterior.
- `chatbot_resource_logs` — reuso de `audit_logs` + `chatbot_resource_executions`.

**Convenção:** exclusão lógica via `deleted_at`, `updated_by` para auditoria, `is_active` para toggle.

## O que peço agora

Aprovar a **Onda 1** (layout EZ + bloco Transferência com CRUD real de vínculos agente↔equipe, drag-and-drop, save/discard sticky, migration + RLS + auditoria).

As Ondas 2–5 seguem em turnos separados, cada uma revisável isoladamente. Confirma que posso começar pela Onda 1?
