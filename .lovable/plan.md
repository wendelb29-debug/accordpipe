
# Collabs como chat omnichannel interno real

Hoje a tela `src/pages/Collabs.tsx` usa dados mock (conversas e mensagens hardcoded). Vou transformar em um chat interno real, persistido e em tempo real, escopado por tenant (`servidor_id`), removendo todos os mocks.

## 1. Banco de dados (migração)

Novas tabelas em `public`:

- **`collab_conversations`** — `id`, `servidor_id`, `kind` (`group|channel|collab|copilot|video|direct`), `name`, `emoji`, `color`, `created_by`, `is_pinned`, `last_message_at`, `last_message_preview`, timestamps.
- **`collab_members`** — `id`, `conversation_id`, `user_id`, `role` (`owner|admin|member`), `joined_at`, `last_read_at`, `is_muted`. Unique `(conversation_id, user_id)`.
- **`collab_messages`** — `id`, `conversation_id`, `servidor_id`, `sender_id`, `content` (text), `attachments` (jsonb — array de `{kind,name,size,url}`), `reply_to_id`, `system` (bool), `created_at`, `edited_at`, `deleted_at`.
- **`collab_reactions`** — `id`, `message_id`, `user_id`, `emoji`, `created_at`. Unique `(message_id, user_id, emoji)`.

Cada tabela: GRANTs para `authenticated` + `service_role`, RLS habilitado.

Políticas RLS (sem subqueries recursivas — usar funções `SECURITY DEFINER` quando necessário):
- `is_collab_member(conv_id, user_id)` — função para checagem reutilizável.
- Conversations: SELECT se membro OU mesma `servidor_id` e `kind='channel'`. INSERT por usuários do tenant. UPDATE/DELETE por `owner/admin`.
- Members: SELECT por membros da mesma conversa. INSERT/DELETE por owner/admin.
- Messages: SELECT por membros. INSERT pelo próprio `sender_id` sendo membro. UPDATE/DELETE só pelo autor.
- Reactions: SELECT por membros. INSERT/DELETE pelo próprio `user_id`.

Trigger em `collab_messages` para atualizar `last_message_at` e `last_message_preview` da conversa.

Realtime: adicionar `collab_conversations`, `collab_members`, `collab_messages`, `collab_reactions` ao `supabase_realtime`.

Storage: usar bucket `documents` existente, com pasta `collabs/<servidor_id>/<conversation_id>/`.

## 2. Frontend — `src/pages/Collabs.tsx`

Remoção total dos mocks (`conversations`, `initialMessages`, `MENTIONS`, sistema de demo).

Refatorar para:
- Buscar conversas reais via `supabase.from('collab_conversations')` filtradas pelas que o usuário é membro (RLS cuida) + canais públicos do tenant.
- Carregar mensagens da conversa ativa via `collab_messages` com join leve em `profiles` (nome/avatar do autor).
- Realtime por canal:
  - `collab-list-<servidor>` para a sidebar (novas conversas, last_message_preview).
  - `collab-conv-<conversationId>` para mensagens + reações da conversa aberta.
- Enviar mensagem → INSERT em `collab_messages`. Reply → setar `reply_to_id`. Reações → INSERT/DELETE em `collab_reactions`. Upload → storage `documents` + INSERT com `attachments`.
- Modal "Criar" cria registro real em `collab_conversations` + members selecionados. "Convidar" insere members.
- Marcar como lido: ao abrir a conversa, atualizar `last_read_at` no membro; badge de não lidas = `count(messages where created_at > last_read_at)`.
- Empty states limpos quando não há conversas/mensagens (sem fallback mock).

Mantém o visual atual (sidebar roxa, feed branco, cards premium, emojis, stickers, anexos, menções a usuários reais).

## 3. Detalhes técnicos

- `useActiveCompanyId()` continua sendo a fonte do `servidor_id`.
- Menções continuam usando `profiles` do tenant (já implementado).
- Sem edge functions novas — tudo direto pelo client com RLS.
- Sem alterações em outras telas/rotas.

## Fora de escopo

- Integrações omnichannel externas (WhatsApp/Email/IG) — só chat interno agora.
- Vídeo real (Jitsi/Daily) — `kind=video` cria a conversa, integração real fica para depois.
- CoPilot IA — `kind=copilot` cria a conversa; respostas do bot ficam para próxima iteração.
