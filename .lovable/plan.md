
# Reorganização visual da aba WhatsApp do Tenant (estilo EZ Chat)

Vou reorganizar a aba **Webhooks Z-API** (em Editar Tenant) em quatro sub-abas em formato de pílulas, mantendo 100% do que já funciona hoje. Nada é removido, renomeado ou alterado em backend — só apresentação e novos campos aditivos onde necessário.

## Escopo — o que muda

Apenas UI dentro de `src/components/atendimento/tabs/WebhookConfig.tsx` e novos componentes filhos. Todos os campos, endpoints, edge functions, RLS e schema **permanecem intactos**.

## Arquitetura das 4 pílulas

```text
┌ [Lista] ─ [⚙ Nome do canal] ─ [Templates] ─ [+ Criar template] ┐
│                                                                   │
│  conteúdo da pílula ativa                                         │
└───────────────────────────────────────────────────────────────────┘
```

Pílula ativa em amarelo/dourado (token `primary` do Accord); inativas em cinza-escuro.

### 1. Pílula "Lista"
Tabela de instâncias do tenant. Hoje há 1 por tenant (linha vinda de `tenant_whatsapp_integrations` ativa), mas a UI já suporta N linhas.
- Busca, toggle Ativos/Removidos, seletor "Mostrar N por página".
- Colunas: Status (badge), Nome do canal, appName, identificador, Número (`connected_phone`), Fluxo padrão, "Permite ativo", "Permite envio massivo", criado/atualizado.
- Botão **"+ Adicionar novo"** → abre o mesmo fluxo de `InstanceCredentialsCard` já existente.
- Paginação numérica e "Mostrando X-Y de Z".

### 2. Pílula central "⚙ Nome do canal"
Layout 2 colunas.

**Esquerda** — Card com sub-abas internas:
- **Instância**: seção "01 — Dados da instância" (upload de imagem de perfil, categoria, descrição rich-text simples, appName, nome de exibição, telefone com bandeira, recado, e-mail, endereço, site, site secundário). Mapeia para os campos de identidade já existentes; campos novos ficam em `provider_metadata` (JSONB já disponível na tabela — aditivo, não altera schema).
- **Webhooks**: reaproveita 100% da configuração atual de webhook (URLs, eventos, hash, notify_me) apresentada como **cards com tags** de eventos ("Eventos de Mensagem" / "Eventos de Sistema"). Cabeçalho "+ Criar webhook" abre modal com toggle "Usar webhook da Z-API/Uazapi" (auto-gera URL usando o `buildUrl` já existente) e checkboxes para eventos.

**Direita** — 2 cards fixos:
- **Informações da integração** (somente leitura, aviso "Dados sensíveis — não compartilhe"): Name, WabaID/Instance ID, Status (`connection_status`), Qualidade, Conversas iniciadas, botão refresh. Reaproveita `InstanceStatusCard`.
- **Configurações**: nome de exibição, fluxo padrão, e toggles agrupados:
  - **MENSAGENS**: Permitir ativo, Permitir transmissão
  - **ATENDIMENTO**: Simular digitando, Restringir atendentes
  - Cada toggle com ícone em caixa arredondada, título negrito, descrição cinza, switch à direita. Botão "Salvar" dourado no rodapé. Persiste em `tenant_whatsapp_integrations.provider_metadata`.

### 3. Pílula "Templates"
Galeria em grid de templates (reaproveita `whatsapp_quick_replies` ou tabela de templates existente, o que já for usada no projeto — se não houver, listagem vazia com CTA para "+ Criar template", sem criar tabela nova nesta iteração).
- Busca, filtro de período "Data de criação", toggle grid/lista, refresh, "Mostrar N".
- Aviso amarelo "Modelos pendentes podem levar até 24h para aprovação".
- Card: nome, badge categoria (MARKETING/UTILIDADE/AUTENTICAÇÃO), ícone de status, preview em mockup de celular estilo WhatsApp, ícones de ações (duplicar, testar, copiar link, excluir, compartilhar), datas.
- Clique abre modal "Pré-visualização do template".

### 4. Pílula "+ Criar template"
Formulário 1 coluna + mockup de celular fixo à direita (preview em tempo real).
- Seção "Nome do template e idioma" (contador de caracteres, seletor de idioma).
- Seção "ID do Template" (slug auto — reaproveita `src/lib/slugify.ts`).
- Seção "Categoria" (3 radio cards + subtipos: Padrão, Catálogo, Carrossel, Oferta por tempo limitado).
- Seção "Conteúdo": Cabeçalho, Corpo (editor com formatação + "+ Adicionar variável" + contador 0/1024), Rodapé (60 chars), Botões (até 10).
- Rodapé: "Limpar formulário" (neutro) e "Publicar" (dourado).

## Compatibilidade — o que NÃO muda

- `WebhookConfig.tsx` continua sendo o entry-point importado pelos consumidores atuais.
- `InstanceCredentialsCard`, `InstanceStatusCard`, `UazapiWebhookSection` continuam existindo e são reaproveitados.
- Todos os campos `zapi_webhook_*` em `companies`, RPCs `get_company_webhook_config`, edge function `zapi-webhook` e `whatsapp-test-connection` — intocados.
- `provider_type` (`zapi` | `uazapi`), fluxo de save/test/setActive/clear no `useTenantWhatsAppIntegration` — intocados.
- Nenhuma migration nesta iteração. Configurações novas dos toggles usam `provider_metadata` (JSONB já existente).

## Arquivos (novos e editados)

**Editar** (1):
- `src/components/atendimento/tabs/WebhookConfig.tsx` — vira o container das 4 pílulas.

**Novos** (5) em `src/components/atendimento/tabs/whatsapp/`:
- `WhatsAppPillNav.tsx` — barra de pílulas.
- `InstanceListTab.tsx` — tabela "Lista".
- `InstanceDetailTab.tsx` — 2 colunas com sub-abas Instância/Webhooks + cards direita (reagrupa `InstanceCredentialsCard`, `InstanceStatusCard`, seção webhooks existente e novo painel de toggles).
- `TemplatesTab.tsx` — galeria de templates.
- `CreateTemplateTab.tsx` — formulário + preview de celular.

## Detalhes técnicos

- Design tokens: só `bg-primary`, `bg-card`, `bg-muted`, `text-foreground` etc. Zero cor hardcoded.
- Mockup de celular: componente simples `<PhonePreview>` interno, sem dependência nova.
- Editor rich-text simples: `<textarea>` + toolbar com `document.execCommand` fallback, sem instalar libs.
- Toggles novos persistem em `integration.provider_metadata.settings.{allow_active, allow_broadcast, simulate_typing, restrict_agents}` via `save()` do hook existente.
- Templates: se não existir tabela dedicada, exibo estado vazio com CTA; **não criarei migration nesta iteração** para não escapar do escopo "aditivo apenas em UI".

## Fora de escopo (para próximas iterações, se quiser)

- Tabela `whatsapp_templates` com aprovação/status real via Meta/WABA.
- Múltiplas instâncias reais por tenant (a UI já prepara, backend continua 1 por tenant).
- Integração de disparo real dos templates (hoje só CRUD/preview).

Confirma que sigo por esse caminho? Posso implementar tudo em UI pura sem tocar em backend/schema nesta rodada.
