
# Envio em Massa — Marketing (Accord)

Novo módulo dentro do workspace **Marketing**, sem tocar no Kanban de Marketing atual, no Accord Stack ou no módulo de E-mail. Multi-tenant (isolado por `server_id`), reaproveitando instâncias WhatsApp (uazapiGO/Z-API) e contas Outlook/Gmail já conectadas.

## Escopo funcional

Wizard de 4 etapas + aba **Envios** (histórico) + aba **Modelos**.

### Etapa 1 — Dados
- Nome, descrição
- Canal: `whatsapp` ou `email`
- Sub-seleção: instância WhatsApp conectada (do tenant) OU conta Outlook/Gmail conectada (do tenant)

### Etapa 2 — Público-alvo
Três modos:
1. **Upload CSV/XLSX** — parsing client-side (papaparse + xlsx), preview das colunas
2. **Base do CRM** — filtros: pipeline (workspace), tags, classificação, DDI/DDD (WhatsApp) ou segmento/domínio (e-mail). Lista só libera após ao menos 1 filtro
3. **Manual** — tabela editável (nome, contato, variáveis livres)

### Etapa 3 — Conteúdo
- **WhatsApp:** lista de templates aprovados do canal (reuso do que já existe), busca, filtro por categoria/tipo, preview estilo celular, painel de mapeamento de variáveis (coluna do público ↔ valor fixo)
- **E-mail:** editor de assunto + corpo (rich text) com variáveis `{{nome}}`, preview estilo caixa de entrada
- Botão **Salvar modelo**

### Etapa 4 — Configurações
- Velocidade: Lento / Médio (padrão) / Rápido — com aviso de risco
- Contatos por lote + intervalo entre lotes (min)
- Agendamento (data/hora início)
- Janela diária de envio (hora início / fim) — pausa fora da janela

### Aba Envios (histórico)
Lista campanhas com filtros por status (rascunho, agendada, em andamento, pausada, concluída, falhou), canal e data. Drill-in mostra total, entregues, falhas, respostas.

### Aba Modelos
Lista de modelos salvos, busca por nome, filtro por canal/tipo, favoritos.

## Modelo de dados (novas tabelas)

Todas com `tenant_id` (server_id) e RLS por tenant do usuário logado; GRANT completo para `authenticated` e `service_role`.

```text
mass_campaigns
  tenant_id, name, description, channel (whatsapp|email),
  channel_ref (instance_id ou email_account_id),
  status (draft|scheduled|running|paused|completed|failed),
  audience_mode (file|crm|manual), audience_snapshot jsonb,
  content_type (template|editor), template_id, subject, body,
  variable_mapping jsonb,
  speed (slow|medium|fast), batch_size int, batch_interval_min int,
  scheduled_at, daily_window_start time, daily_window_end time,
  totals jsonb (queued/sent/failed/replied), created_by

mass_campaign_recipients
  campaign_id, tenant_id, name, contact (phone|email), variables jsonb,
  status (pending|sending|sent|failed|skipped), error, sent_at

mass_templates
  tenant_id, name, channel, category, type, subject, body,
  variables jsonb, is_favorite, created_by
```

RLS: `SELECT/INSERT/UPDATE/DELETE` restrito a membros do tenant via `user_tenants`. Master enxerga tudo.

## Backend (edge functions)

- `mass-campaign-dispatcher` — worker acionado por pg_cron (a cada 1 min) que pega campanhas `running`/`scheduled` dentro da janela, respeita `batch_size`/`batch_interval_min`, envia via:
  - WhatsApp: reusa helpers `uazapi` já existentes
  - E-mail: reusa contas Gmail/Outlook conectadas (connector gateway ou tokens do tenant)
- `mass-campaign-preview` — renderiza template com variáveis para preview
- `mass-campaign-start/pause/cancel` — muda status
- Fila em `mass_campaign_recipients` com status; retry simples em falha transitória

## Frontend

Rota nova: `/marketing/envio-massa` (não altera `/marketing` atual do Kanban).

- Sidebar Marketing ganha sub-item "Envio em Massa" (só isso, sem mexer no Kanban)
- Componentes:
  - `MassCampaignWizard.tsx` (stepper 4 etapas)
  - `steps/DadosStep.tsx`, `PublicoStep.tsx`, `ConteudoStep.tsx`, `ConfiguracoesStep.tsx`
  - `MassCampaignsList.tsx` (histórico)
  - `MassTemplatesTab.tsx`
  - `PhonePreview.tsx`, `EmailPreview.tsx`
  - `AudienceFileUpload.tsx`, `AudienceCrmFilter.tsx`, `AudienceManualTable.tsx`
  - `VariableMappingPanel.tsx`

Deps novas: `papaparse`, `xlsx` (se ainda não presente).

## Garantias de não-regressão

- Não altera `Marketing.tsx` (Kanban), Accord Stack, `Email.tsx`, nem tabelas `email_accounts`, `whatsapp_instances`, `crm_leads` (apenas leitura via RPC/select).
- Nenhuma mudança em RLS existente; apenas novas tabelas.
- Templates WhatsApp já existentes continuam servindo o Accord Stack — módulo só lê.

## Entrega em ondas

1. **Onda A — DB + shell UI:** migrations (tabelas, RLS, GRANT, cron), rota, sidebar item, listagem vazia.
2. **Onda B — Wizard WhatsApp:** 4 etapas end-to-end para WhatsApp com envio real via uazapi.
3. **Onda C — Wizard E-mail:** editor de e-mail, integração com contas conectadas, envio.
4. **Onda D — Modelos + Histórico avançado:** aba modelos com favoritos, drill-in do histórico com KPIs.

Confirma pra eu começar pela Onda A? Se preferir, também posso começar direto por WhatsApp (A+B juntos) e deixar e-mail pra depois.
