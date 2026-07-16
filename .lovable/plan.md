
# Configurações de Atendimento, Equipe e Automação

Nova página `/configuracoes/atendimento` com 3 abas em accordion, no espírito do EZ Chat. **Não altera** o modal "Configurações WhatsApp" do Accord Stack nem a página de Usuários — apenas complementa.

## Escopo por onda (dado o tamanho)

Vou entregar em 3 ondas para caber num ciclo estável. Todas multi-tenant (`tenant_id = activeCompanyId`), RLS por tenant, e cada painel é um accordion independente.

---

### Onda A — Fundação + Aba Atendimento (essenciais)

**Backend (1 migration):**
- `service_settings` (singleton por tenant): distribuição, recursos do chat (toggles), transferência, mensagens automáticas (entrada/transferência/espera/finalização), horário de atendimento (JSON 7 dias) + mensagem fora do expediente.
- `service_departments` (nome, cor, atendentes vinculados via `service_department_members`, tipo).
- `service_classifications` e reutiliza `whatsapp_labels` já existente para tags — adiciona coluna `department_ids uuid[]` + `distribution_rule jsonb`.
- `service_holidays` (nome, data, recorrência, department_id, mensagem, cobertura).
- Todas com GRANT + RLS por tenant + admin/ceo/master para escrita.

**Frontend:**
- Página `src/pages/ConfiguracoesAtendimento.tsx` com `<Tabs>` (Atendimento, Equipe e Recursos, Automação).
- Aba Atendimento com `<Accordion>` de painéis:
  1. Distribuição de atendimentos
  2. Recursos do chat (toggles)
  3. Transferências
  4. Mensagens automáticas + horário de atendimento
  5. Gerenciar departamentos
  6. Classificações
  7. Tags (reaproveita `whatsapp_labels`)
  8. Feriados e datas especiais
- Rota em `App.tsx`, item na `Sidebar.tsx` dentro do grupo Configurações.

### Onda B — Aba Equipe e Recursos

**Backend:**
- Estende `user_tenants` com `service_department_ids uuid[]` e `supervisor_department_ids uuid[]` (nullable, default `{}`).
- Reaproveita `user_roles` + `user_custom_permissions` já existentes (3 perfis padrão: Atendente, Supervisor, Administrador).
- Novas: `service_agent_templates` (agente → templates liberados), `service_access_windows` (usuário, dias, horário), `service_stickers` (imagem, departamentos), `service_break_types` (nome, minutos). Reaproveita `whatsapp_quick_replies` já existente para atalhos.

**Frontend:**
- Aba com accordions: Equipe (extende listagem de usuários com colunas de departamento e status online/offline), Permissões (papéis padrão + editor de permissões por módulo/ação), Templates por atendente, Mensagens rápidas (atalho para `whatsapp_quick_replies`), Horário de acesso, Figurinhas, Tipos de pausa.

### Onda C — Aba Automação e Comunicação

**Backend:**
- `flow_settings` (singleton: auto-organizar nós, permitir publicação).
- `scheduled_messages` (protocolo, atendente, cliente, canal, mensagem, agendado_para, status).
- `attendance_links` (tipo `generic|whatsapp`, canal/instância, departamento, contato opcional, slug único).

**Frontend:**
- Aba com 3 painéis: Configurações do Flow Builder (toggles), Mensagens agendadas (lista + busca), Criar link de atendimento (form + lista com copiar).
- Edge function pública `/attendance-link/:slug` que roteia para chat/wa.me.

---

## Garantias

- Não toco em `AccordStack.tsx`, no modal "Configurações WhatsApp", em `Usuarios.tsx` nem nos fluxos do Flow Builder existentes.
- Reaproveito `whatsapp_labels` (tags), `whatsapp_quick_replies` (mensagens rápidas), `user_roles` + `user_custom_permissions` (permissões), `tenant_departments` já existentes (verifico e uso como base de "departamentos de atendimento" em vez de criar tabela nova, se o schema atual servir).
- Cada painel salva de forma independente (botão "Salvar" próprio) — mudanças em um accordion não afetam os outros.
- Isolamento por tenant em toda tabela e todo query.

## Confirmação

Posso começar pela **Onda A** neste turno (migration + página + aba Atendimento funcional)? Ondas B e C entram nas próximas mensagens para manter cada entrega revisável.
