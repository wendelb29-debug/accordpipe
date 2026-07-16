## Contexto

O Accord já tem a página `AuditLogs.tsx` (rota `/configuracoes/logs`, 1.133 linhas) com muita coisa pronta: leitura de `audit_logs`, filtros básicos, export CSV via edge function. O pedido é **reconstruir essa aba dentro do módulo Analytics** seguindo o padrão visual/funcional do EZ Chat (referência das imagens), sem quebrar o resto do Accord.

Como o escopo é muito grande (banco novo, RLS, filtros avançados, painel lateral com diff, timeline de execução, reversão, exports XLSX/JSON/PDF, atualização automática, responsividade, permissões por perfil), vou entregar em **6 ondas**. Cada onda finaliza uma fatia utilizável antes de seguir.

## Fase 0 — Descoberta (antes de codar)

1. Ler `AuditLogs.tsx` inteiro para reaproveitar filtros/query builder existentes.
2. Confirmar rota final da aba dentro de Analytics — proposta: manter `/configuracoes/logs` como fica hoje **e** adicionar uma aba "Auditoria" dentro do módulo Analytics (caminho a alinhar: `/relatorios?tab=auditoria` ou aba nova). **Decisão pendente com o usuário.**
3. Mapear componentes reutilizáveis (`DataTable`, `DateRangePicker`, `Sheet`, `Badge`, `DropdownMenu`) — não recriar.

## Fase 1 — Banco e imutabilidade (Onda 1)

Migration que:

- Estende `audit_logs` (já existe) com colunas faltantes: `actor_type`, `agent_id`, `module`, `event_type`, `title`, `entity_type`, `entity_id`, `status`, `severity`, `source`, `conversation_id`, `contact_id`, `channel_id`, `team_id`, `automation_id`, `resource_id`, `integration_id`, `request_id`, `trace_id`, `started_at`, `completed_at`, `duration_ms`, `error_code`, `error_message`, `ip_address_masked`, `device_type`, `browser`, `app_version`, `environment`. Só cria as que faltarem.
- Cria `audit_log_changes` (id, audit_log_id, field_name, field_label, old_value, new_value, change_type, is_sensitive).
- Cria `audit_log_steps` (id, audit_log_id, step_order, step_name, status, started_at, completed_at, duration_ms, input_data, output_data, error_message).
- Cria `audit_log_exports` (id, exported_by, filters jsonb, format, row_count, file_path, created_at).
- Cria `audit_log_reversions` (id, original_log_id, new_log_id, reverted_by, created_at).
- GRANTs para `authenticated` (SELECT) e `service_role` (ALL). **Sem INSERT/UPDATE/DELETE para authenticated** — append-only, escrita só via edge functions com `service_role`.
- RLS: `SELECT` filtrado por `company_id = get_user_company_id(auth.uid())` + role check (admin/CEO/master vê tudo; gestor/supervisor por módulo; atendente somente eventos onde `actor_id = auth.uid()` ou `assigned_to`); sem policy de INSERT/UPDATE/DELETE.
- Índices: `(company_id, created_at desc)`, `event_type`, `module`, `actor_id`, `agent_id`, `status`, `entity_type`, `entity_id`, `conversation_id`, `contact_id`, `trace_id`.
- Trigger que bloqueia UPDATE/DELETE em `audit_logs` (função `raise 'audit_logs is append-only'`).

## Fase 2 — Shell da aba dentro de Analytics (Onda 2)

- Criar `src/pages/Analytics.tsx` (ou reaproveitar `Relatorios`) com abas horizontais no estilo EZ: **Histórico de atendimentos · Indicadores · Monitoramento · Status dos atendentes · Download de Relatórios · Supervisor IA · Auditorias**. Aba "Auditorias" ativa por default para a implementação.
- Rota: `/analytics` (ou reuso), aba controlada por `?tab=auditoria&section=audit|content-analyzes`.
- Sub-cards colapsáveis "Análise de conteúdo" e "Auditoria" como na referência.
- Manter `/configuracoes/logs` redirecionando para a nova aba para não quebrar links.

## Fase 3 — Cabeçalho, filtros e tabela (Onda 3)

Componentes em `src/components/analytics/audit/`:

- `AuditToolbar.tsx` — botões Atualizar (com estados), Exportar (dropdown CSV/XLSX/JSON), menu com Atualização automática (Off / 30s / 1min / 5min), timestamp da última atualização, aviso "Há novos eventos".
- `AuditFilters.tsx` — busca (debounce 400ms), período (presets + custom range), tipo de evento (multi), módulo (multi), origem, usuário (combobox), agente (combobox), canal, status, nível, botão "Mais filtros · N" abrindo popover com contato/conversa/equipe/recurso/automação/integração/IP/dispositivo/campo/trace/duração/tem-erro/tem-alterações; botão "Limpar filtros".
- `AuditTable.tsx` — colunas Data/hora, Evento (ícone+título+descrição), Responsável (avatar+tipo), Módulo (badge), Entidade (link), Status (badge com ícone), Ações (menu). Ordenação server-side. Paginação server-side (20/50/100). Skeleton, estado vazio (com/sem filtros), estado de erro, estado sem permissão.
- `useAuditLogs.ts` — hook com query builder, debounce, paginação, ordenação, auto-refresh e detecção de "novos eventos" (compara `created_at` do topo).

## Fase 4 — Painel lateral de detalhes (Onda 4)

`src/components/analytics/audit/AuditDetailSheet.tsx`:

- Sheet lateral 45% no desktop, fullscreen no mobile. URL sincronizada `?event=<id>`.
- Cabeçalho: ícone, título, badge de status, timestamp, copiar ID, menu de ações (abrir conversa/contato/agente/automação, copiar, exportar evento).
- Seções: Resumo · Responsável · Contexto · Alterações · Execução · Conversa e IA · Dados técnicos (colapsado).
- **Alterações**: diff campo-a-campo (`audit_log_changes`), diff linha-a-linha para prompts longos usando `diff` (dependência pequena), mascaramento `••••••••` para `is_sensitive=true`, opção "Mostrar todos os campos".
- **Execução**: timeline vertical a partir de `audit_log_steps`.
- Botões "Abrir X" navegam para a rota interna preservando `?event=` e filtros na volta (salva estado no `sessionStorage`).

## Fase 5 — Exportação e reversão (Onda 5)

- Edge function `audit-export` (estende a `audit-export-csv` existente): aceita `format` ∈ {csv, xlsx, json}, `scope` ∈ {page, filtered, single}, aplica os mesmos filtros da UI via service_role, mascara campos sensíveis, grava um novo `audit_logs` com `event_type='audit.exported'` e insere em `audit_log_exports`. XLSX via `xlsx` (já usado no projeto).
- Edge function `audit-revert`: valida permissão (admin/CEO), busca estado atual da entidade, compara com `new_value` do evento (detecta conflito → confirmação extra), aplica reversão via service_role no recurso original, cria novo `audit_logs` com `event_type='audit.reverted'` + link em `audit_log_reversions`. **Bloqueia** para mensagens, exclusões definitivas, ações financeiras, webhooks executados, eventos de segurança.
- Modal `RevertChangeDialog.tsx` com resumo antes/depois e confirmação.

## Fase 6 — Emissores de eventos, permissões finais e polimento (Onda 6)

- Helper `logAudit()` em `supabase/functions/_shared/audit.ts` para uso em todas as edge functions críticas (auth, agentes, automações, canais, conversas, CRM, integrações, admin). Não substituir instrumentação existente; **acrescentar** onde faltar, sem quebrar o que já grava em `audit_logs`.
- Instrumentar pontos-chave (não todos de uma vez — os mais visíveis: agentes CRUD, automação CRUD, transferência de atendimento, canal conectado/desconectado, permissão alterada, export).
- Permissões por perfil no frontend (esconder "Reverter" para não-admin, esconder aba para atendente sem escopo, etc.), reforçando o que já é bloqueado por RLS.
- Notificações via `sonner`: atualizada, erro, filtros limpos, ID copiado, export iniciado/concluído, reversão OK/erro, novos eventos.
- Responsividade: filtros empilhados no mobile, tabela vira cards, sheet fullscreen.
- QA final: typecheck limpo, sem console.error, verificação de RLS entre empresas.

## Detalhes técnicos

- Diff textual: adicionar `diff` (~30KB) para line-diff em prompts. `jsondiffpatch` seria pesado demais — evitar.
- XLSX: já disponível via `xlsx` (usado em `MassCampaignWizard`).
- Auto-refresh: `useInterval` com pausa quando a aba está oculta (`document.visibilityState`) e quando o sheet de detalhes está aberto (não interromper análise).
- URL state: `useSearchParams` para tab/section/event/página/filtros persistentes (compartilháveis).
- Mascaramento: função `maskSensitive(value, isSensitive)` server-side no export e client-side no diff.
- Rota antiga `/configuracoes/logs` → `<Navigate to="/analytics?tab=auditoria" />` para não quebrar bookmarks.

## Riscos e trade-offs

- **Instrumentação global de eventos** é o maior custo: fazer 100% "big-bang" quebraria fluxos. Onda 6 cobre só os módulos mais visíveis; o restante fica documentado como próxima iteração.
- **Reversão universal** não é viável — implementamos apenas para tipos seguros (config de agente, automação, permissão, recurso), com bloqueio explícito nos demais.
- **Análise de conteúdo** (card superior das imagens) fica como placeholder na Onda 2 e vira Onda futura se for prioridade.

## Perguntas antes de começar

1. **Rota**: cria página nova `/analytics` (com todas as sub-abas do EZ) ou encaixa a aba "Auditoria" dentro do `/relatorios` que já existe? A referência mostra 7 sub-abas — se elas não existem hoje, viram placeholders.
2. **Instrumentação**: OK fazer só os módulos mais visíveis na Onda 6 e documentar o resto como pendente?
3. **"Análise de conteúdo"**: fica placeholder por enquanto?