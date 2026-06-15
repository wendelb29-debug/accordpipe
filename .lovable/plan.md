
# Comentários ricos + Notificações no Feed

## 1. Banco de dados (migração)

**`feed_post_comments` — colunas novas:**
- `parent_id uuid` (FK → `feed_post_comments.id` ON DELETE CASCADE) — para respostas
- `mentions uuid[]` default `'{}'` — IDs dos usuários mencionados
- `mention_all boolean` default `false` — quando ceo/admin usa `@todos`

**Nova tabela `feed_comment_reactions`:**
- `id`, `comment_id`, `user_id`, `emoji` (default `❤️`), `servidor_id`, `created_at`
- UNIQUE (comment_id, user_id, emoji)
- RLS: leitura por membros do tenant; insert/delete pelo próprio user
- GRANTs padrão + service_role

**Realtime:** adicionar `feed_post_comments`, `feed_comment_reactions` à `supabase_realtime`.

**Trigger `notify_feed_event`** (AFTER INSERT em `feed_post_comments` e `feed_post_reactions`):
- Comentário em post: notifica autor do post (se ≠ comentarista) — tipo `feed_comment`
- Resposta a comentário: notifica autor do comentário pai — tipo `feed_reply`
- Menções: notifica cada user em `mentions` — tipo `feed_mention`
- `mention_all=true` (só efetivo se autor for ceo/admin): notifica todos profiles ativos do tenant — tipo `feed_mention`
- Curtida em post: notifica autor do post — tipo `feed_reaction`
- Insere em `notifications` (já tem realtime + `useNotificationManager` que toca som e dispara push do navegador)

## 2. Hook `useFeedPosts`

- Buscar até 2 comentários mais recentes (`parent_id IS NULL`) por post para prévia + contagem de reactions por comentário
- Expor `preview_comments: CommentPreview[]` em cada `FeedPost`

## 3. UI

**`PostComments.tsx` (refatorado):**
- Suporte a threads (1 nível): comentário pai + filhos indentados
- Botão "Curtir" por comentário (toggle ❤️) com contador
- Botão "Responder" → abre input inline preenchido com `@nome `
- Input com autocomplete de menção: digitar `@` → dropdown com profiles do tenant. CEO/admin veem opção `@todos` no topo
- Parser de menção: ao enviar, extrai nomes → resolve a user_ids → grava `mentions[]` e `mention_all`
- Renderização: tokens `@nome` viram chip azul clicável

**`FeedCommentsPreview.tsx` (novo):**
- Renderizado dentro do card do post quando `comments_count > 0` e drawer fechado
- Mostra até 2 comentários (avatar, nome, conteúdo curto, "curtir · responder · X há")
- Link "Ver todos os N comentários" abre o drawer/expansão completa

**`AccordFeedPremium.tsx`:** integrar `FeedCommentsPreview` abaixo das ações de cada post.

## 4. Notificações

Reutiliza `useNotificationManager` (já existe):
- Som via WebAudio em qualquer notificação nova
- Push do navegador (`Notification` API) já dispara automaticamente para inserts em `notifications` do user atual
- `NotificationBell` mostra contador
- Para menções, o `title` da notificação será `"@Fulano te mencionou"` → push do navegador exibe

## 5. Arquivos

- **Migração:** `supabase/migrations/<ts>_feed_comments_threading_mentions.sql`
- **Edita:** `src/hooks/useFeedPosts.ts`, `src/components/home/PostComments.tsx`, `src/components/home/AccordFeedPremium.tsx`, `src/integrations/supabase/types.ts` (regenerado)
- **Novo:** `src/components/home/FeedCommentsPreview.tsx`, `src/components/home/MentionInput.tsx`

## Detalhes técnicos

- Menção `@todos` só dispara fan-out se autor possuir role `ceo` ou `admin` (validado no trigger via `has_role`)
- Trigger usa `create_notification` para respeitar `servidor_id`
- Curtida só notifica se houver ≥1 reação nova do user diferente do autor (idempotência via UNIQUE)
- Limite anti-spam: trigger ignora auto-notificação (user_id = author)
