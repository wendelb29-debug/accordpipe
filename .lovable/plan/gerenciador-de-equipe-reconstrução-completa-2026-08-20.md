# Gerenciador de Equipe — reconstrução completa

Reconstruir a seção **Gerenciador de Equipe** dentro da aba já existente **Equipe e Recursos** (em `/configuracoes/atendimento`), reproduzindo o layout/UX da EZ Chat com a identidade do Accord. Zero mocks; tudo persiste no Supabase com RLS por tenant e auditoria.

## Descoberta e reuso (feito antes de qualquer código)

Antes de criar tabelas novas, reaproveitar o que já existe:

- `chatbot_agent_teams` + `chatbot_team_members` + `chatbot_team_rules` (equipes de agente/IA — vamos **estender**, não duplicar).
- `tenant_departments`, `user_departments`, `profiles`, `user_roles`, `user_tenants` (usuários e departamentos reais).
- `service_settings`, `chatbot_business_hours`, `chatbot_communication_settings` (horários, distribuição, pausas).
- `whatsapp_instances`, `email_accounts`, `whatsapp_workspace_config` (canais conectados).
- `audit_logs` (auditoria — Onda de Auditoria já entregou trilha imutável).

Nada de tabela nova de usuários. Nada de rota nova. A seção fica **dentro do painel de "Equipe e Recursos"** já existente.

## Onda 1 — Banco (extensão, sem duplicar)

Extender `chatbot_agent_teams` para virar a entidade "equipe de atendimento" completa. Novas colunas opcionais (não quebram uso atual):

- `description`, `icon`, `color`, `team_type` (`atendimento` | `comercial` | `suporte` | `financeiro` | `administrativo` | `custom`)
- `status` (`active` | `inactive` | `archived`), `archived_at`, `deleted_at`
- `distribution_method` (`round_robin` | `least_load` | `contact_owner` | `deal_owner` | `manual_priority` | `manual` | `specialty`)
- `max_concurrent_conversations`, `queue_timeout_minutes`
- `fallback_action` (`keep_queue` | `route_team` | `route_ai` | `create_callback` | `block` | `notify_supervisor`), `fallback_team_id`
- `use_business_hours` (bool), `schedule_mode` (`company` | `24x7` | `custom`)

Estender `chatbot_team_members`:

- `member_role` (`responsible` | `supervisor` | `agent` | `observer`), `priority`, `max_concurrent`, `member_status` (`active` | `inactive`), `joined_at`

Novas tabelas (só onde não há equivalente):

- `team_channels` — vínculo equipe ↔ canal (WhatsApp/Email/etc.) + regra (`all` | `transfers_only` | `subject` | `after_hours` | `priority`)
- `team_schedules` — dia da semana + até 2 janelas (com almoço); FK `team_id`
- `team_specialties` — assuntos e membros associados (para distribuição por especialidade)
- `team_member_availability` — status ao vivo (`available`/`busy`/`away`/`break`/`meeting`/`offline`) com timestamps

RLS em todas: `servidor_id = get_user_company_id(auth.uid())` ou `is_master`. Escrita restrita a admin/CEO/master. Grants explícitos para `authenticated` + `service_role`. Triggers de `updated_at` e de auditoria (chamando `audit_logs` com `module='atendimento'`, `event_type='team_*'`).

## Onda 2 — Hook e serviço de dados

Criar `src/hooks/useTeams.ts` com:

- Query paginada com filtros (status, disponibilidade, departamento, canal, tipo, texto)
- Facets (contagens por status/departamento/canal)
- Realtime nas 5 tabelas para atualizar cards em tempo real
- Mutations: `createTeam`, `updateTeam`, `toggleActive`, `archive`, `restore`, `softDelete`, `duplicate`
- `addMember`, `removeMember`, `updateMemberRole`, `updateMemberLimit`
- `setChannels`, `setSchedule`, `setSpecialties`
- `runDistributionTest(payload, dryRun)` — pura em client, retorna diagnóstico

Camada de mapeamento centralizada em `src/lib/teams/*` para não vazar SQL na UI. Toda mutation grava evento em `audit_logs` (via RPC `log_audit_event`).

## Onda 3 — Shell da seção + Lista + Filtros

Reescrever `TransferenciaEquipePanel.tsx` (já existente na aba "Equipe e Recursos") como o novo Gerenciador. Não cria rota nova; substitui o conteúdo do card.

Componentes:

- `TeamManagerHeader` — título "Gerenciador de Equipe", descrição, busca com debounce 400ms, botão **Criar equipe** (primário).
- `TeamManagerFilters` — chips compactos (Status, Disponibilidade, Departamento, Canal, Tipo) + "Limpar filtros".
- `TeamsGrid` — grid responsiva de `TeamCard`.
- `TeamCard` — ícone/cor, nome, descrição, badges (departamento, tipo, disponibilidade textual + ícone), pilha de avatares (até 4 + "+N"), badges de canais conectados, contadores (membros disponíveis, atendimentos ativos, limite), menu ⋮ com todas as ações (Abrir, Editar, Gerenciar membros, Horários, Distribuição, Testar, Duplicar, Ativar/Desativar, Arquivar, Excluir) — cada uma respeitando RBAC.
- Estados: skeleton grid durante loading, empty state ("Nenhuma equipe criada" + CTA), erro com "Tentar novamente".

Estilo: light cards, borda `border-border/60`, radius `rounded-xl`, sombras suaves, roxo Accord como primário, tipografia atual. Responsivo (grid 3/2/1 col).

## Onda 4 — Wizard "Criar/Editar equipe" (6 etapas)

`TeamWizardDialog` — modal grande no desktop, sheet full-screen no mobile. Stepper superior + rodapé com Cancelar/Voltar/Avançar/Salvar rascunho/Criar.

Etapas:

1. **Informações gerais** — nome (validação de duplicidade por tenant), descrição, cor, ícone, departamento (real, com opção "sem departamento"), tipo, switch "Equipe ativa".
2. **Membros** — busca sobre `profiles` do tenant, seleção múltipla persistente através de páginas, badges das equipes que o usuário já compõe, alerta ao selecionar inativo. Lista de selecionados com seletor de função (Responsável/Supervisor/Atendente/Observador) e limite individual.
3. **Canais** — lista somente canais conectados do tenant (`whatsapp_instances`, `email_accounts`, workspace configs). Switch de ativação + regra de recebimento por canal.
4. **Horário** — radio: usar horário da empresa | 24h | específico. Modo específico: 7 dias com 1–2 janelas, fuso do tenant, checkbox "atender em feriados" com equipe de plantão.
5. **Capacidade** — máximo por equipe, limite por membro (opcional), ação ao atingir limite (`fallback_action`), timeout de fila (min), notificação a supervisor.
6. **Distribuição** — cards radio com os 7 métodos + config específica (drag-and-drop para prioridade manual; matriz assunto↔membro para especialidade). Fallback e observações.

Validação em cada etapa antes do "Avançar". Ao concluir → cria equipe + membros + canais + horários + regras numa única transação (via RPC). Auditoria: `team_created` com payload completo.

## Onda 5 — Painéis auxiliares

- **Abrir equipe** (`TeamDetailSheet`) — painel lateral direito (full-screen mobile), abas: Visão geral, Membros (com indicadores reais: atendimentos ativos, tempo médio, última atividade), Disponibilidade ao vivo, Canais, Distribuição, Permissões, Histórico (últimos eventos da auditoria filtrados por `entity_type=team` e `entity_id`).
- **Gerenciar membros rápido** (`TeamMembersDialog`) — busca + lista + adicionar/remover em lote, exigindo destino de redistribuição quando remover membro com atendimentos ativos.
- **Perfil do membro** (`TeamMemberProfileSheet`) — dados + ações (alterar função, limite, prioridade, remover).
- **Testar distribuição** (`DistributionTestDialog`) — formulário (canal, dia/horário simulado, assunto, prioridade, contato, membros forçados como disponíveis) + botão "Executar teste" (dry-run). Retorna: elegibilidade da equipe, filtro de horário, filtro de canal, avaliados/ignorados com motivo, escolhido, fallback usado. Toggle "Executar com dados reais" exige confirmação.
- **Duplicar** — modal com checkboxes do que copiar; nome padrão "Cópia de …".
- **Ativar/Desativar/Arquivar/Excluir** — confirmações com impacto real (contagem de atendimentos ativos, automações e agentes vinculados). Exclusão exige digitar o nome; usa `deleted_at` (soft delete).

## Onda 6 — Realtime, permissões, auditoria, responsividade

- Assinar `postgres_changes` em `chatbot_agent_teams`, `chatbot_team_members`, `team_member_availability`, `whatsapp_chats` (para contagem de atendimentos ativos) — canais únicos com cleanup em unmount.
- RBAC end-to-end: cada ação do menu ⋮ escondida/desabilitada quando o papel não permite; validação também no backend via RLS/RPC.
- Auditoria cobrindo todas as ações listadas nos requisitos.
- Ajustes finos de responsividade (grid, filtros em drawer no mobile, wizard fullscreen no mobile, painéis fullscreen no mobile).
- Acessibilidade: labels, foco em modais, navegação por teclado, status textual + ícone.
- Verificação final: `tsgo`, console limpa, teste manual dos critérios de aceite 1–34.

## O que fica fora deste plano

- Não vamos criar tela de usuários. Reaproveitamos `profiles`/`user_tenants`.
- Não vamos duplicar `tenant_departments` nem `whatsapp_instances`.
- Não vamos criar rota nova; a seção continua vivendo em `/configuracoes/atendimento` → aba "Equipe e Recursos" → card **Gerenciador de Equipe** (substitui o painel atual `TransferenciaEquipePanel`, preservando o nome do arquivo para não quebrar imports).

## Entrega por turno

Cada onda entra em um turno separado. Vou pedir confirmação antes de disparar a migration (Onda 1) e depois seguir. Se preferir que eu combine ondas 3+4 num único turno para acelerar a parte visual, é só dizer.

## Detalhes técnicos

- Stack: React 18 + TS + Tailwind, shadcn/ui, `@dnd-kit`, `date-fns`, Supabase JS.
- Fonte da verdade em `chatbot_agent_teams` — reutiliza policies existentes; migration adiciona colunas + FKs + índices + triggers de auditoria.
- Realtime via `supabase.channel(...)` **dentro de `useEffect`** com cleanup obrigatório (evita loop de reconexão).
- Distribuição implementada como função pura em `src/lib/teams/distribution.ts` para caber no dry-run do teste; a distribuição real (produção) continua no edge/webhook de roteamento existente e chamará essa mesma função para consistência.
- Toda mutation encapsulada em RPC `SECURITY DEFINER` com validação de tenant + role, evitando manipulação de `servidor_id` pelo cliente.
- Auditoria: `audit_logs` recebe `module='atendimento'`, `entity_type='team'`, `entity_id=teams.id`, `event_type` específico e `details` com diff.

Aguardo "seguir" para começar pela **Onda 1 (migration)**.
