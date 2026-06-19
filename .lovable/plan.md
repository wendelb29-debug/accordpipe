
# Replicar fluxo Zuper no card de vendas

Especificação grande — vou dividir em **7 fases entregáveis**. Cada fase já fica funcional e pode ser revisada antes da próxima. Tudo dentro do componente atual `CrmLeadDetailView` (memória: mantém `LeadPropostasTab` legado como entrypoint).

> **Decisão importante:** mantenho o design system atual do Accord (dark theme #050505, header h-14, botão "Ganho" emerald, navegação pela seta azul). Replico **funcionalidade e fluxo** do Zuper, **não a paleta clara** dele.

---

## Fase 1 — Pipeline horizontal de etapas (no topo do card)

- Adicionar barra horizontal clicável logo acima das infos do lead, dentro de `CrmLeadDetailView`.
- Cada etapa = botão. Etapa atual em destaque (primary). Demais neutras.
- Click muda `stage_id` do lead via `useCrmLeads.updateLead` (já existe).
- Etapas vêm de `kanban_columns` do workspace (não hardcoded — respeita configuração do tenant).
- Mobile: scroll horizontal com snap.

## Fase 2 — Aba Propostas: modal de modelo + ajustes na tela cheia

Já existe `ZuperProposalModule` + `NewProposalModal` + `ZuperProposalForm`. Vou:

- **Modal "Escolha o modelo"**: já existe. Refinar copy e adicionar dropdown de templates ativos (`proposal_templates`).
- **Tela cheia** (`ZuperProposalForm`): garantir que renderiza
  - Header com logo do tenant + CNPJ + responsável
  - 3 blocos: Dados da Pessoa / Empresa / Proposta (com data criação auto + validade +15d editável)
  - Editor TipTap para Introdução (Bold/Italic/listas/undo/redo)
  - Busca de catálogo (`proposal_catalog_items`) com qtd + "Adicionar Item"
  - Tabela de itens com tipo (P&S / MRR), qtd, unitário, total, remover
  - Barra inferior fixa: Voltar / Template / Link Público / Gerar PDF / Salvar
- **Listagem**: 2 cards de resumo (P&S total + MRR total/mês com nota), tabela com Proposta/Dono/P&S/MRR/Validade/Cobrança/Status/Ações, paginação 25/pg.

## Fase 3 — Aba Principal (resumo financeiro do card)

- 3 cards no topo: P&S (itens + R$), MRR (itens + R$/mês), nota informativa.
- Cálculo a partir de `proposals` + `proposal_line_items` do lead, filtrando status `aberta` ou `aprovada`.
- Abaixo: form de criação configurável (estado vazio quando workspace não tem form vinculado).

## Fase 4 — Aba Arquivos (rename de "Docs") + dropdown "Gerar Documento" + modal "Variáveis em branco"

- Renomear label da aba para "Arquivos".
- Botão **+ Gerar Documento** vira `DropdownMenu` listando templates ativos de `document_templates` do tenant.
- Ao escolher um template: roda o `buildVariableMap` que já existe, identifica variáveis sem dado, abre **modal "Variáveis em branco"** com lista (`{{COMPANY_CNPJ}} — CNPJ`, etc.) e botões **Cancelar / Gerar assim mesmo**.
- Mantém botão **Enviar arquivo** (PDF/Word) já implementado e abre direto signatários com dono do card obrigatório.
- Estado vazio com ícone de pasta + "Os arquivos do card aparecerão aqui".

## Fase 5 — Aba Formulários em sub-abas

- Buscar formulários vinculados ao workspace (`crm_forms` filtrado por `workspace_id`).
- Sub-tabs (Tabs aninhada) — uma por formulário.
- Cada sub-tab: cabeçalho com **Link Público** e **Editar**, grid 2 colunas com campos preenchidos do lead (Nome, Email, WhatsApp, CPF, DoB, CNPJ, Razão Social, CEP, Rua, Número, Complemento, Bairro, Cidade, Estado).

## Fase 6 — Polish nas abas Agenda / Notas / Ligações

- **Agenda**: título "Agenda / Compromissos", subtítulo "Gerencie os compromissos e atividades deste card", botão "+ Novo Compromisso", estado vazio com ícone + textos.
- **Notas**: adicionar hint "Ctrl+V para colar imagem" abaixo do editor.
- **Ligações**: estado vazio com instrução "Use o botão 📞 ao lado do telefone do contato para iniciar uma ligação".

## Fase 7 — Aba Transcrição (nova)

- Nova aba dedicada listando transcrições de ligações (já temos `transcription` em ligações).
- Estado vazio adequado.

---

## Detalhes técnicos

- **Sem migration nova nessa rodada** — todas as tabelas já existem (`proposals`, `proposal_line_items`, `proposal_templates`, `proposal_catalog_items`, `document_templates`, `crm_forms`, `kanban_columns`).
- **Reuso máximo**: `CrmLeadDetailView` orquestra; cada aba fica em arquivo próprio em `src/components/atendimento/tabs/` para reduzir o monstro de 1900 linhas atual.
- **Pipeline horizontal**: novo componente `LeadStagePipeline.tsx`, usa `useKanbanColumns(workspaceId)` (já existe).
- **Variáveis em branco**: lógica já parcialmente existe em `LeadDocumentosTab` (`buildVariableMap` + `CRITICAL_VARS`). Vou expor a lista completa de placeholders detectados no template.
- **Editor rich text**: usa TipTap já presente em `IntroSection` (verifico se há dependência ou troco por implementação leve com `contenteditable` + comandos do form).

---

## Pontos para confirmar antes de começar

1. **Etapas do pipeline**: você quer que as etapas venham dinâmicas do `kanban_columns` do workspace, ou prefere fixar exatamente as 10 etapas que listou (Standby → ... → Assinatura Contrato) hardcoded?
2. **Ordem de execução**: começo pela **Fase 1 (pipeline)** ou pela **Fase 4 (Arquivos + dropdown + modal variáveis)** que parece mais urgente pelos prints anteriores?
3. **Aba "Transcrição" separada**: cria aba nova, ou junta dentro de Ligações como sub-seção?
4. **Form de criação configurável (Fase 3)**: existe alguma tabela/coluna que liga formulário-de-criação ao workspace? Ou só mostro o estado vazio por enquanto?
