## Objetivo

1. Aba **Closer** na sidebar → página `/closer` com as 3 abas do `rapport-master-tool` (Atendimento, DISC na prática, Metodologias), adaptada ao tema Accord.
2. Workspace ganha tipo: `crm` | `sdr` | `cadastro`. Ao criar workspace o usuário escolhe o tipo.
3. Workspaces do tipo **SDR** ganham aba extra "SDR OS" (sequência 7d, conversacional IA, scripts) ao lado do Kanban atual. Têm funil/leads próprios.
4. Lead SDR qualificado → ação "Enviar pro Closer" copia o lead pro funil CRM normal (workspace destino escolhido).

---

## 1. Banco

Migration única:

- `workspaces.workspace_type text not null default 'crm' check in ('crm','sdr','cadastro')` — popula tudo existente como `crm`.
- Nova tabela `sdr_leads` (funil SDR isolado, RLS por `workspace_id` reusando a policy padrão de workspaces):
  - `id, workspace_id, owner_id, name, phone, email, source, stage` (`novo|tentativa_1|tentativa_2|conectado|qualificado|descartado`), `notes, last_touch_at, next_touch_at, sequence_day` (0–7), `qualified_at, promoted_lead_id` (FK opcional `crm_leads`), `created_at, updated_at`.
- Nova tabela `sdr_sequence_events` (log das mensagens da sequência 7d): `id, sdr_lead_id, day, channel, sent_at, response`.
- GRANT + RLS escopado por workspace (mesmo padrão de `crm_leads`).

Função `public.promote_sdr_lead(sdr_lead_id uuid, target_workspace_id uuid)` (SECURITY DEFINER) que cria `crm_leads` na primeira coluna do kanban do workspace destino, grava `promoted_lead_id`, marca `stage='qualificado'`, `qualified_at=now()`.

## 2. Arquivos copiados de `rapport-master-tool` (adaptados)

| Origem | Destino no Accord | Adaptação |
|---|---|---|
| `src/routes/index.tsx` (3 abas Closer) | `src/pages/Closer.tsx` | Vira página React Router, usa `AppLayout`, tokens do Accord |
| `src/routes/sdr.tsx` | `src/components/sdr/SdrPanel.tsx` | Componente reusável, montado dentro do workspace SDR |
| `src/routes/api/sdr.ts` (server route TanStack) | `supabase/functions/sdr-ai/index.ts` | Edge Function, AI SDK via `npm:ai` + `npm:@ai-sdk/openai-compatible`, helper `ai-gateway` inline |
| `src/lib/ai-gateway.server.ts` | inline na edge function | — |
| `src/lib/sdr-data.ts`, `sdr-storage.ts` | `src/lib/sdr/` | `sdr-storage` passa a usar Supabase (`sdr_leads`) em vez de localStorage |
| `src/lib/disc-*.ts`, `metodologias.ts` | `src/lib/closer/` | puro, sem mudança |
| `src/components/DiscQuizDialog.tsx` | `src/components/closer/DiscQuizDialog.tsx` | trocar cores hard-coded por tokens do Accord |

Cliente passa a chamar `supabase.functions.invoke("sdr-ai", { body })` em vez de `fetch("/api/sdr")`.

## 3. Workspaces — UI

- `WorkspaceFormDialog` (criar/editar workspace): novo `Select` "Tipo" com 3 opções; ícone e descrição curtos.
- Lista de workspaces mostra badge do tipo (CRM / SDR / Cadastro).
- `useWorkspaces` retorna `workspace_type`.

## 4. Página do workspace

No layout do workspace (CRM/Atendimento), quando `workspace_type === 'sdr'`:
- Topo do workspace ganha **abas**: `Funil SDR` (Kanban com os stages SDR usando `sdr_leads`) e `SDR OS` (`<SdrPanel/>` — conversacional IA, sequência 7d, scripts).
- Cards do funil SDR têm botão "Enviar pro Closer" → modal pra escolher workspace CRM destino → chama `promote_sdr_lead` RPC → toast + remove do funil SDR.
- Workspaces `crm` continuam exatamente como hoje (sem aba extra).

## 5. Navegação

`Sidebar.tsx`: novo item **Closer** (ícone `Headphones` ou `MessageSquareQuote`) → `/closer`, perto de Accord Pulse/Atendimento. Adicionar `routePrefetch` da rota nova.

`App.tsx`: rota `/closer` com `ProtectedRoute` + `AppLayout`, lazy import `Closer`.

## 6. Infra IA

- Dependências: `bun add ai @ai-sdk/openai-compatible` (usadas só pela edge function via `npm:`, mas mantemos no `package.json` p/ tipos).
- `LOVABLE_API_KEY` já é auto-provisionada pelo Lovable Cloud; verifico via `fetch_secrets` e provisiono se faltar antes do deploy.
- Edge function `sdr-ai` com CORS, `verify_jwt` default, valida body com Zod, usa `google/gemini-3-flash-preview` via `createLovableAiGatewayProvider`. Trata 429 (rate limit) e 402 (créditos esgotados) com mensagens claras.

## 7. Design

- Cores, espaçamento e tipografia 100% do Accord (dark `#050505`, `text-foreground`, `gradient-primary` roxo, `rounded-2xl`, `h-14` headers).
- Nada de cores azul/indigo originais do `rapport-master-tool`.

## 8. Ordem de execução

1. Migration (workspace_type + sdr_leads + sdr_sequence_events + RPC `promote_sdr_lead`).
2. Edge function `sdr-ai` + deps (`ai`, `@ai-sdk/openai-compatible`).
3. Libs em `src/lib/closer/` e `src/lib/sdr/` (incluindo `sdrApi.ts` que substitui `localStorage` por Supabase).
4. Componentes: `SdrPanel.tsx`, `DiscQuizDialog.tsx`, abas Closer.
5. Página `Closer.tsx` + rota.
6. UI workspace: tipo no form, badge, aba SDR no layout do workspace SDR.
7. Sidebar: item Closer + prefetch.
8. Verificar `LOVABLE_API_KEY`, smoke test Conversacional IA e Sequência 7d.

## Riscos

- Volume grande de arquivos novos — entrega em uma leva, mas typecheck no fim.
- Migration que adiciona coluna `not null default 'crm'` em `workspaces` é segura (não bloqueia leitura).
- Promoção SDR→CRM precisa que a primeira coluna do Kanban exista no workspace destino; se não houver, o RPC retorna erro tratado.
