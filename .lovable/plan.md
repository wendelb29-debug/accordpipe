
# Integração uazapiGO no Accord — 5 ondas

Escopo aprovado: executar as 5 ondas em sequência dentro da mesma entrega, respeitando o preâmbulo (multi-tenant, tokens só em Edge Functions, `track_source/track_id`, `excludeMessages: ["wasSentByApi"]`). Sem tocar em telas fora do escopo (kanban, contratos, assinatura, Base de Clientes existente — apenas anexos aditivos onde a onda pede).

## Pré-requisitos (bloqueiam deploy)

Preciso de dois secrets antes de qualquer chamada real à uazapiGO:

- `UAZAPI_BASE_URL` — ex.: `https://<seu-subdominio>.uazapi.com` (sem barra final)
- `UAZAPI_ADMIN_TOKEN` — admintoken do painel uazapiGO

Vou solicitar via `add_secret` no início da execução. O código é escrito e as Edge Functions ficam prontas mesmo sem os valores; só param de responder 200 até você preencher.

## Onda 1 — Estrutura + conexão QR

**DB (migration):**
- `public.whatsapp_instances(id, tenant_id UNIQUE, uazapi_instance_id, uazapi_token, instance_name, status, phone_number, profile_name, profile_pic_url, created_at, updated_at)`
- RLS: `SELECT` para membros do tenant; escrita apenas via `service_role`. GRANTs conforme padrão do projeto.
- Trigger `updated_at`.

**Edge Functions:**
- `uazapi-create-instance` — usa `admintoken` (Secret), POST `/instance/init`/`/instance/create` conforme retorno, persiste token+id.
- `uazapi-connect-instance` — POST `/instance/connect` com `token` da instância, retorna QR base64.
- `uazapi-instance-status` — GET `/instance/status`, sincroniza tabela, retorna status atual. Ao detectar `connected`, chama internamente o setup de webhook (antecipação da Onda 3, já que o próprio prompt pede).
- `uazapi-disconnect-instance` — POST `/instance/disconnect`.

**UI (nova pílula "uazapiGO" em `src/components/atendimento/tabs/WebhookConfig.tsx`):**
- Novo componente `whatsapp/UazapiInstancePanel.tsx` com estados: sem instância → botão Conectar; `connecting` → QR + polling 3s (timeout 2min); `connected` → foto/nome/número + Desconectar.
- Adiciona `"uazapi"` como valor extra em `WhatsAppPillNav` (não remove pílulas atuais).

## Onda 2 — Envio de texto e mídia

**Edge Functions:**
- `uazapi-send-text` — POST `/send/text` com `number/text/readchat/track_source=accord/track_id=<lead_id>`. Registra em `whatsapp_messages` (tabela existente).
- `uazapi-send-media` — POST `/send/media` (`type`, `file` URL pública do Storage, `text`/`docName`).
- `uazapi-check-number` (best-effort) — POST `/chat/check`.

**UI:**
- No painel de chat do lead (inbox WhatsApp já existente), enviar via essas funções em vez do provider atual quando a instância uazapi for a ativa do tenant. Mantém fallback Z-API/Uazapi legado inalterado.

## Onda 3 — Webhook de entrada

**Edge Function pública `uazapi-webhook`** (`verify_jwt = false`):
- Identifica tenant via `uazapi_instance_id`/telefone no payload.
- Eventos: `messages` (grava em `whatsapp_messages`, cria contato/lead se novo pelo fluxo existente), `messages_update` (atualiza status), `connection` (atualiza `whatsapp_instances.status`). Demais eventos ignorados. Sempre 200. Log de payload cru na primeira execução por instância para calibrar parser.

**Edge Function `uazapi-setup-webhook`** — POST `/webhook` com `events: ["messages","messages_update","connection"]`, `excludeMessages: ["wasSentByApi"]`, url da função pública. Chamada automática no `uazapi-instance-status` quando detecta `connected`.

Realtime já configurado em `whatsapp_messages` — apenas confirmar.

## Onda 4 — Campanhas em massa

**DB (migration):**
- `public.whatsapp_campaigns(id, tenant_id, folder_id, name, status, scheduled_for, created_at, updated_at)` com RLS por tenant.

**Edge Functions:**
- `uazapi-create-campaign` — resolve telefones dos `lead_ids`, POST `/sender/simple`, salva `folder_id`.
- `uazapi-campaign-control` — POST `/sender/edit` com `stop|continue|delete`.
- `uazapi-list-campaigns` — GET `/sender/listfolders`.

**UI:** nova página `src/pages/WhatsAppCampanhas.tsx` + rota `/whatsapp/campanhas`, entrada no Sidebar dentro do grupo Atendimento. Seleção de leads reaproveitando `EntityCombobox`/filtro existente da Base; campos delay min/max, agendamento, placeholder `{{name}}`. Lista de campanhas com ações pausar/continuar/excluir.

## Onda 5 — Grupos + verificação

**Edge Functions:**
- `uazapi-check-numbers` — batch `/chat/check`.
- `uazapi-group-list` — GET `/group/list`.

**UI:**
- Passo opcional na importação de leads existente: botão "Verificar WhatsApp" que marca `whatsapp_valid` no lead (aditivo, não bloqueia importação).
- Nova sub-pílula "Grupos" dentro da aba uazapiGO listando grupos (read-only).

## Segurança & convenções

- Todos os endpoints Edge Function validam `Authorization` do usuário logado e checam `user_tenants` para o `tenant_id` requisitado antes de ler `whatsapp_instances`.
- `admintoken` só na função `uazapi-create-instance`; demais usam token da instância buscado com `service_role` server-side.
- Nunca retornar `uazapi_token` ao client. Coluna nunca exposta via `SELECT` do client (RLS bloqueia leitura direta).
- Zero chamada à uazapiGO no frontend.
- Payloads sempre incluem `track_source: "accord"` e `track_id`.
- Webhook sempre com `excludeMessages: ["wasSentByApi"]`.
- CORS padrão do projeto em todas as funções.

## Ordem de execução

1. `add_secret` para `UAZAPI_BASE_URL` e `UAZAPI_ADMIN_TOKEN`.
2. Migration Onda 1 (whatsapp_instances) → aguardar aprovação.
3. Onda 1: 4 Edge Functions + `UazapiInstancePanel` + integração no `WebhookConfig`.
4. Onda 2: 3 Edge Functions + hook do envio no inbox.
5. Onda 3: `uazapi-webhook` público + `uazapi-setup-webhook` + auto-setup no status.
6. Migration Onda 4 (whatsapp_campaigns) → aguardar aprovação.
7. Onda 4: 3 Edge Functions + página `WhatsAppCampanhas` + rota + sidebar.
8. Onda 5: 2 Edge Functions + botão de verificação na importação + sub-pílula Grupos.

## Fora de escopo (confirmado)

Newsletters/canais, chamadas de voz, Chatwoot, catálogo de negócios, comunidades, botões/listas/enquetes/carrossel/localização, pareamento por número (`phone`), edição/criação de grupos, `updateFieldsMap` de placeholders customizados.

Confirma para eu iniciar pela solicitação dos dois secrets e a migration da Onda 1?
