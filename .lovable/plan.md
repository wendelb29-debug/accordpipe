# Módulo Nova Proposta (estilo Zuper) — plano de execução

Substitui o formulário atual de propostas do card de lead por um fluxo completo: modal de modelo → formulário em seções numeradas → barra inferior fixa → listagem com totalizadores → página pública de aceite. Mantém `LeadPropostasTab` como entrypoint (regra de memória), mantém `proposal_catalog_items` e o gerador `generateProposalPdf` (jsPDF), e isola tudo por `servidor_id` (multi-tenant).

Combo **fica de fora** (decidido). Itens suportados: **Serviço (P&S)** e **MRR**.

---

## 1. Banco de dados (migration única)

### 1.1 Cardápio: adicionar suporte a P&S
- `proposal_catalog_items.item_type` já existe → garantir valores aceitos: `servico` | `mrr` (drop "combo" da UI, mas não força CHECK pra não quebrar dados).
- Nenhuma nova coluna.

### 1.2 Tabela `proposals` (estender, não recriar)
Hoje tem 15 colunas. Adicionar:
- `version int default 1`
- `control_code text` (ex `OP-00015`) + sequence por tenant
- `client_oc text` (nº OC do cliente)
- `currency text default 'BRL'`
- `title text default 'Proposta Comercial'`
- `created_date date default current_date`
- `validity_days int default 30`
- `intro_html text` (rich text)
- `observations text`
- `ps_payment jsonb` (`{method, mode, days_to_first, installments:[{date,number,value,method}]}`)
- `mrr_payment jsonb` (`{method, due_day, first_date, num_installments}`)
- `totals jsonb` (`{ps_total, mrr_monthly, mrr_contract, grand_total}`)
- `template_id uuid` (FK opcional)
- `public_token text unique` (link público)
- `public_accepted_at timestamptz`, `public_accepted_ip text`, `public_accepted_name text`, `public_accepted_doc text`
- `status text default 'aberta'` (aberta | aprovada | recusada)

### 1.3 Tabela `proposal_items` (estender)
Adicionar:
- `item_type text` (servico | mrr)
- `discount_type text default 'percent'` (percent | fixed)
- `discount_value numeric default 0`
- `position int default 0`

### 1.4 Nova: `proposal_templates`
Colunas: `id, servidor_id, name, description, intro_html, observations, default_validity_days, is_active`.
RLS por tenant. GRANTs pra `authenticated` + `service_role`.

### 1.5 Nova: `proposal_public_events` (auditoria do link público)
Colunas: `id, proposal_id, event_type (view|accept|reject), ip, user_agent, payload jsonb, created_at`.
RLS: tenant pode `SELECT` (proposal pertence a ele); `INSERT` permitido pra `anon` quando o token bate (via RPC `record_proposal_public_event(token, ...)`).

### 1.6 Sequence por tenant pro `control_code`
Tabela `proposal_control_sequences (servidor_id pk, last_number int)`.
Função `next_proposal_control_code(servidor_id)` retorna `OP-00001`, `OP-00002`...

### 1.7 RPC pública `get_proposal_by_public_token(token text)`
SECURITY DEFINER, sem PII sensível além do necessário pra renderizar; retorna proposta + itens + totals + branding da empresa.

---

## 2. Frontend — arquitetura

```
src/components/atendimento/proposta/
├── LeadPropostasTab.tsx         (REUTILIZA o legado — só substitui o conteúdo interno)
├── NewProposalModal.tsx          modal "Proposta Padrão | Usar Template"
├── ProposalFormShell.tsx         shell com scroll + barra fixa inferior
├── sections/
│   ├── HeaderSection.tsx         logo + fornecedor + responsável + versão + OC
│   ├── ClientSection.tsx         pessoa + empresa + moeda/título/datas
│   ├── IntroSection.tsx          TipTap (bold, italic, ul, ol, undo, redo)
│   ├── ItemsSection.tsx          busca produto + tabela editável + badge tipo
│   ├── PaymentPSSection.tsx      meio + à vista/parcelado + tabela parcelas
│   ├── PaymentMRRSection.tsx     meio + dia venc + 1ª parcela + nº parcelas + totais
│   └── ObservationsSection.tsx
├── ProposalListView.tsx          tabela com totalizadores + ações
├── ProposalBottomBar.tsx         Voltar | Template | Link Público | Gerar PDF | Salvar
└── hooks/
    ├── useProposalForm.ts        react-hook-form + zod
    └── useProposalTotals.ts      memo dos cálculos (P&S/MRR separados)
```

### Página pública
- Rota nova: `/p/proposta/:token` em `src/pages/PropostaPublica.tsx`
- Renderiza read-only + botões **Aceitar** / **Recusar** com captura de nome+CPF+IP
- Chama RPC `accept_proposal_public(token, name, doc)` ou `reject_proposal_public(token, reason)`

---

## 3. Cálculos (regras-chave)

- Item: `total = qtd * unit * (1 - disc%/100)` ou `qtd * unit - discR$`
- `ps_total = Σ items[type=servico].total`
- `mrr_monthly = Σ items[type=mrr].total`
- `mrr_contract = mrr_monthly * num_installments` (frequência mensal fixa, conforme spec)
- Parcelas P&S: gera N linhas a partir de `first_date + days_to_first`, mensais, valor = `ps_total / N` (última absorve diferença)
- Todos os valores formatados via `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`

---

## 4. PDF

- Reusa `src/lib/generateProposalPdf.ts` (jsPDF nativo — regra de memória diz pra manter separado de contrato de assinatura)
- Acrescenta seções: header com versão+OC, introdução (HTML→texto), bloco P&S separado do MRR, observações
- Emojis stripados (regra: pdf-lib/jsPDF winAnsi)

---

## 5. Templates

- Nova aba em `Configurações > Propostas > Templates` com CRUD
- Form: nome, descrição, introdução (rich text), observações, validade padrão
- Ao escolher "Usar Template" no modal: pré-preenche intro + observações + validade

---

## 6. Listagem (substitui a atual)

Tabela com: Status (badge), Sigla, Título, Data, Validade, Total itens, Dono, **P&S**, **MRR**, Ações.
Topo: cards "P&S: X itens • R$ Y,YY" e "MRR: X itens • R$ Y,YY/mês".
Nota: "Valores consideram apenas propostas abertas e aprovadas".

---

## 7. Entregas por etapa (dentro do mesmo big bang)

1. Migration (tabelas/colunas/RPC/sequence) — gera tipos
2. Hooks + form shell + sections (Header → Cliente → Intro → Itens → P&S → MRR → Obs)
3. Bottom bar + modal de modelo + listagem nova
4. Templates (CRUD simples)
5. Página pública `/p/proposta/:token` + aceite
6. Ajuste do `generateProposalPdf` pras novas seções
7. QA visual no preview

---

## Pontos que precisam confirmação

- **Aceite público sem login**: confirmo que cliente informa **nome + CPF/CNPJ** (sem upload de RG, sem selfie). Aceite legal = clique + IP + timestamp + nome/doc autodeclarado. Ok?
- **Permissão pra criar/editar template**: hoje só Master? Ou Admin/CEO do tenant também?
- **Listagem nova vs atual**: posso substituir totalmente a tabela atual da `LeadPropostasTab` por essa nova, ou quer manter a antiga em paralelo?
- **Versão de proposta**: ao "Duplicar" eu incremento `version` automaticamente, ou duplica como v1 nova?