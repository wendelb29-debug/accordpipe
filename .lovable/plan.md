# Plano de Implementação: Módulo Save Car Individual

Implementar a subaba "Individual" no módulo "Save Car" do Closer, integrando fluxos de recuperação de associados com CRM e WhatsApp no workspace Kamilla.

## Mudanças Técnicas

### Frontend
- **Novo Componente**: `src/components/closer/SaveCarIndividual.tsx`
  - UI baseada no design system do Accord (hero card azul-marinho, cards brancos, botões esmeralda).
  - Gestão de estado para dados do lead (nome, veículo anterior).
  - Gerador de scripts com substituição dinâmica de variáveis.
  - Ramificações interativas (Continua, Trocou, Vendeu) com animações.
  - Integração com `crm_leads` para criação de cards no Kanban ao iniciar o contato.
  - Prevenção de duplicidade na criação de leads.

- **Atualização de Componente**: `src/components/closer/CloserPanel.tsx`
  - Adição de sub-navegação para o módulo Save Car (Individual, Importar Planilha, etc.).
  - Integração do componente `SaveCarIndividual`.
  - Persistência básica de abas durante a sessão.

### Backend & Segurança
- **Dados**: Utilização da infraestrutura existente de `closer_playbooks` e `closer_scripts`.
- **CRM**: Integração com a tabela `crm_leads` respeitando o isolamento por `workspace_id` e `servidor_id`.
- **RLS**: As políticas existentes já garantem o isolamento multi-tenant por `servidor_id`. O acesso é restrito via `useAuth` e permissões de workspace.

## Detalhes Visuais
- **Identidade**: Degradê azul-marinho no cabeçalho, ícones Lucide, sombras suaves.
- **Responsividade**: Layout adaptável para mobile com botões empilhados e campos em coluna.

## Verificação
- Testar preenchimento de variáveis nos scripts.
- Validar criação de lead no Kanban ao clicar em WhatsApp.
- Verificar alternância entre ramificações (Passo 1/2 no "Vendeu").
- Confirmar que as ações são restritas ao workspace Kamilla conforme configurado no `Atendimento.tsx`.
