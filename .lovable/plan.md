# Accord Marketing — Módulo de Disparos em Massa

Novo item na sidebar com 2 frentes: WhatsApp (via Accord Sales/Z-API já configurado) e E-mail (cada usuário liga sua conta Gmail ou Outlook via OAuth).

## Acesso
- Visível na sidebar apenas para `master`, `admin`, `ceo`
- Rota protegida com guard de role

## Estrutura de navegação

```
Accord Marketing
├── Campanhas (lista geral)
├── Nova Campanha WhatsApp
└── Nova Campanha E-mail
```

## Banco de dados

**`marketing_campaigns`**
- tenant_id, created_by, name, channel ('whatsapp' | 'email')
- subject (email), body (texto/html), variables (jsonb)
- audience_source ('clients' | 'leads' | 'csv'), audience_filter (jsonb)
- status ('draft' | 'running' | 'paused' | 'completed' | 'failed')
- email_provider ('gmail' | 'outlook' | null), email_account_id
- throttle_min_ms, throttle_max_ms
- total_recipients, sent_count, failed_count
- started_at, completed_at

**`marketing_campaign_recipients`**
- campaign_id, name, contact (email ou whatsapp), variables jsonb
- status ('pending' | 'sent' | 'failed' | 'skipped')
- sent_at, error_message, provider_message_id

**`marketing_email_connections`** (OAuth por usuário)
- user_id, tenant_id, provider ('gmail' | 'outlook')
- email_address, access_token (cifrado), refresh_token (cifrado), expires_at, scope

RLS: tudo isolado por `tenant_id`; só master/admin/ceo do tenant acessam.

## OAuth E-mail
- **Gmail**: usa connector Lovable `google_mail` OU OAuth próprio por usuário. Como queremos por usuário final do tenant, vamos com OAuth próprio (Google Cloud Console) — secrets `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`.
- **Outlook**: OAuth Microsoft Graph — secrets `MICROSOFT_OAUTH_CLIENT_ID` / `MICROSOFT_OAUTH_CLIENT_SECRET`.
- Edge functions: `marketing-oauth-start`, `marketing-oauth-callback`, `marketing-email-disconnect`
- Tokens armazenados em `marketing_email_connections` com refresh automático

## Edge Functions
1. **`marketing-send-whatsapp`** — pega campanha, itera recipients pendentes, dispara via Z-API do tenant respeitando throttle aleatório (5–15s), atualiza status linha a linha
2. **`marketing-send-email`** — pega campanha, usa conta OAuth do criador, dispara Gmail API ou Microsoft Graph conforme provider, respeita limites diários
3. **`marketing-oauth-start`** / **`marketing-oauth-callback`** — fluxo OAuth Google/Microsoft
4. Cron `pg_cron` chama os senders a cada 1min pra processar campanhas com status `running`

## UI / Páginas
- `src/pages/Marketing.tsx` — lista de campanhas com filtros (canal, status, data)
- `src/pages/MarketingNewWhatsApp.tsx` — wizard 3 passos: audiência → mensagem (com variáveis e mídia) → revisão/agendar
- `src/pages/MarketingNewEmail.tsx` — wizard: escolher conta conectada → audiência → assunto+corpo HTML → revisão
- `src/pages/MarketingCampaignDetail.tsx` — progresso em tempo realtime, lista de destinatários com status, botão pause/retomar
- `src/pages/MarketingSettings.tsx` — gerenciar contas Gmail/Outlook conectadas do usuário logado

Componentes:
- `AudienceSelector` (tabs: Base de Clientes / CRM Leads / CSV Upload) com filtros e preview
- `MessageEditor` (WhatsApp e Email) com inserção de variáveis `{{nome}}`, `{{empresa}}`, etc.
- `CampaignProgressCard` (barra + métricas live via realtime)

## Sidebar
Adicionar ao `AppSidebar` item "Accord Marketing" (ícone Megaphone) com 2 sub-itens, visível só pra master/admin/ceo.

## Itens fora deste MVP
- Pixel de abertura/click tracking em emails (pode vir em v2)
- Templates pré-salvos (v2)
- Agendamento futuro (campo `scheduled_at` fica no schema mas UI vem depois)
- A/B testing (v2)

## Secrets necessários (vou pedir após aprovação)
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (Gmail send scope)
- `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET` (Mail.Send scope)

## Ordem de implementação
1. Migration (3 tabelas + RLS + GRANTs)
2. Item sidebar + roteamento + guard de role
3. Página lista de campanhas (vazia)
4. Wizard Nova Campanha WhatsApp + edge `marketing-send-whatsapp` + cron
5. OAuth Gmail/Outlook (settings page + edge functions)
6. Wizard Nova Campanha Email + edge `marketing-send-email`
7. Página detalhe da campanha com realtime
