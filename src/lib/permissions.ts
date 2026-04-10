import { 
  LayoutDashboard, ShoppingCart, FileText, Activity, DollarSign, 
  FolderOpen, BarChart3, FileSignature, Users, Trash2, 
  MessageSquare, UserCog, Columns3,
  type LucideIcon
} from "lucide-react";

export type DataScope = "own" | "team" | "all";

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
  /** Whether this permission supports data_scope selection */
  scopable?: boolean;
}

export interface PermissionModule {
  key: string;
  label: string;
  icon: LucideIcon;
  permissions: PermissionDef[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permissions: [
      { key: "view_dashboard", label: "Visualizar Dashboard", description: "Acesso à página de dashboard", scopable: true },
    ],
  },
  {
    key: "crm",
    label: "CRM / Sales",
    icon: ShoppingCart,
    permissions: [
      { key: "view_pipeline", label: "Visualizar Pipeline", description: "Ver pipeline de oportunidades", scopable: true },
      { key: "move_card", label: "Mover Card", description: "Arrastar cards entre etapas" },
      { key: "edit_card", label: "Editar Card", description: "Editar dados do card" },
      { key: "delete_card", label: "Excluir Card", description: "Excluir cards do pipeline" },
      { key: "create_lead", label: "Criar Lead", description: "Criar novos leads" },
      { key: "edit_lead", label: "Editar Lead", description: "Editar dados de leads" },
      { key: "transfer_lead", label: "Transferir Lead", description: "Transferir leads entre usuários" },
      { key: "assumir_lead", label: "Assumir Lead", description: "Assumir leads sem responsável" },
      { key: "alterar_responsavel", label: "Alterar Responsável", description: "Mudar responsável de um lead" },
    ],
  },
  {
    key: "propostas",
    label: "Propostas",
    icon: FileText,
    permissions: [
      { key: "view_proposal", label: "Visualizar Proposta", description: "Ver propostas criadas", scopable: true },
      { key: "create_proposal", label: "Criar Proposta", description: "Criar novas propostas" },
      { key: "edit_proposal", label: "Editar Proposta", description: "Editar propostas existentes" },
      { key: "delete_proposal", label: "Excluir Proposta", description: "Excluir propostas" },
      { key: "add_item_proposal", label: "Adicionar Item", description: "Adicionar itens a propostas" },
      { key: "apply_discount", label: "Aplicar Desconto", description: "Aplicar descontos em propostas" },
      { key: "edit_proposal_value", label: "Editar Valor", description: "Editar valores da proposta" },
      { key: "generate_pdf_proposal", label: "Gerar PDF", description: "Gerar PDF da proposta" },
    ],
  },
  {
    key: "contratos",
    label: "Contratos",
    icon: FileSignature,
    permissions: [
      { key: "view_contract", label: "Visualizar Contratos", description: "Ver contratos", scopable: true },
      { key: "create_contract", label: "Criar Contrato", description: "Criar novos contratos" },
      { key: "edit_contract", label: "Editar Contrato", description: "Editar contratos existentes" },
      { key: "send_for_signature", label: "Enviar p/ Assinatura", description: "Enviar contrato para assinatura" },
      { key: "sign_contract", label: "Assinar Contrato", description: "Assinar contratos digitalmente" },
      { key: "cancel_contract", label: "Cancelar Contrato", description: "Cancelar contratos" },
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    permissions: [
      { key: "view_financial", label: "Visualizar Financeiro", description: "Ver módulo financeiro", scopable: true },
      { key: "create_transaction", label: "Criar Transação", description: "Criar novas transações" },
      { key: "edit_transaction", label: "Editar Transação", description: "Editar transações existentes" },
      { key: "delete_transaction", label: "Excluir Transação", description: "Excluir transações" },
      { key: "view_values", label: "Ver Valores", description: "Visualizar valores financeiros" },
      { key: "generate_charge", label: "Gerar Cobrança", description: "Gerar cobranças e boletos" },
      { key: "update_charge", label: "Atualizar Cobrança", description: "Atualizar cobranças existentes" },
      { key: "confirm_payment", label: "Confirmar Pagamento", description: "Confirmar pagamentos recebidos" },
    ],
  },
  {
    key: "usuarios",
    label: "Gestão de Acesso",
    icon: UserCog,
    permissions: [
      { key: "view_users", label: "Visualizar Usuários", description: "Ver lista de usuários" },
      { key: "create_user", label: "Criar Usuário", description: "Criar novos usuários no sistema" },
      { key: "edit_user", label: "Editar Usuário", description: "Editar dados de usuários" },
      { key: "delete_user", label: "Excluir Usuário", description: "Excluir usuários do sistema" },
      { key: "manage_permissions", label: "Gerenciar Permissões", description: "Gerenciar permissões de usuários" },
    ],
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: MessageSquare,
    permissions: [
      { key: "view_conversations", label: "Ver Conversas", description: "Visualizar conversas WhatsApp", scopable: true },
      { key: "send_message", label: "Enviar Mensagem", description: "Enviar mensagens WhatsApp" },
      { key: "assign_conversation", label: "Atribuir Conversa", description: "Atribuir conversas a usuários" },
      { key: "transfer_conversation", label: "Transferir Conversa", description: "Transferir conversas entre usuários" },
      { key: "send_broadcast", label: "Enviar Broadcast", description: "Disparar mensagens em massa" },
    ],
  },
  {
    key: "workspaces",
    label: "Workspaces",
    icon: Columns3,
    permissions: [
      { key: "view_workspace", label: "Visualizar Workspace", description: "Ver workspaces disponíveis" },
      { key: "create_workspace", label: "Criar Workspace", description: "Criar novos workspaces" },
      { key: "edit_workspace", label: "Editar Workspace", description: "Editar workspaces existentes" },
      { key: "configure_pipeline", label: "Configurar Pipeline", description: "Configurar pipeline de vendas" },
      { key: "edit_columns", label: "Editar Colunas", description: "Editar colunas do kanban" },
      { key: "define_sla", label: "Definir SLA", description: "Definir tempos de SLA das etapas" },
    ],
  },
  {
    key: "documentos",
    label: "Documentos",
    icon: FolderOpen,
    permissions: [
      { key: "view_documents", label: "Visualizar Documentos", description: "Ver documentos do sistema" },
      { key: "upload_documents", label: "Enviar Documentos", description: "Upload de documentos" },
      { key: "delete_documents", label: "Excluir Documentos", description: "Excluir documentos" },
    ],
  },
  {
    key: "relatorios",
    label: "Relatórios",
    icon: BarChart3,
    permissions: [
      { key: "view_reports", label: "Visualizar Relatórios", description: "Ver relatórios" },
      { key: "export_reports", label: "Exportar Relatórios", description: "Exportar dados em relatórios" },
    ],
  },
  {
    key: "clientes",
    label: "Base de Clientes",
    icon: Users,
    permissions: [
      { key: "view_clients", label: "Visualizar Clientes", description: "Ver base de clientes", scopable: true },
      { key: "edit_clients", label: "Editar Clientes", description: "Editar dados de clientes" },
      { key: "view_post_sale", label: "Ver Pós-Venda", description: "Acessar aba pós-venda" },
    ],
  },
  {
    key: "descarte",
    label: "Descarte",
    icon: Trash2,
    permissions: [
      { key: "view_discard", label: "Visualizar Descarte", description: "Ver leads descartados" },
      { key: "delete_permanent", label: "Excluir Permanente", description: "Excluir leads permanentemente" },
    ],
  },
  {
    key: "formularios",
    label: "Formulários",
    icon: FileText,
    permissions: [
      { key: "view_forms", label: "Visualizar Formulários", description: "Ver formulários criados" },
      { key: "create_forms", label: "Criar Formulários", description: "Criar novos formulários" },
      { key: "edit_forms", label: "Editar Formulários", description: "Editar formulários existentes" },
    ],
  },
  {
    key: "atividades",
    label: "Atividades",
    icon: Activity,
    permissions: [
      { key: "view_activities", label: "Visualizar Atividades", description: "Ver lista de atividades" },
      { key: "create_activities", label: "Criar Atividades", description: "Criar novas atividades" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.key));

export const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  own: "Próprios",
  team: "Equipe",
  all: "Todos",
};

// Map permission to required route access
export const ROUTE_PERMISSIONS: Record<string, string> = {
  "/home": "view_dashboard",
  "/dashboard": "view_dashboard",
  "/atendimento": "view_pipeline",
  "/formularios": "view_forms",
  "/atividades": "view_activities",
  "/financeiro": "view_financial",
  "/boletos": "view_financial",
  "/documentos": "view_documents",
  "/relatorios": "view_reports",
  "/contratos": "view_contract",
  "/gestao-vendas": "view_pipeline",
  "/cadastrados": "view_clients",
  "/clientes": "view_clients",
  "/descarte": "view_discard",
  "/configuracoes/usuarios": "view_users",
  "/configuracoes/assinaturas": "view_users",
  "/empresas": "edit_clients",
  "/accord-stack": "create_user",
};

// Legacy permission key mapping (old -> new) for backward compatibility
export const LEGACY_PERMISSION_MAP: Record<string, string> = {
  visualizar_dashboard: "view_dashboard",
  visualizar_vendas: "view_pipeline",
  editar_vendas: "edit_lead",
  excluir_vendas: "delete_card",
  visualizar_formularios: "view_forms",
  criar_formularios: "create_forms",
  editar_formularios: "edit_forms",
  visualizar_atividades: "view_activities",
  criar_atividades: "create_activities",
  visualizar_financeiro: "view_financial",
  editar_financeiro: "edit_transaction",
  acessar_boletos: "view_financial",
  visualizar_documentos: "view_documents",
  enviar_documentos: "upload_documents",
  excluir_documentos: "delete_documents",
  visualizar_relatorios: "view_reports",
  exportar_relatorios: "export_reports",
  visualizar_contratos: "view_contract",
  criar_contratos: "create_contract",
  assinar_contratos: "sign_contract",
  visualizar_pipeline: "view_pipeline",
  mover_oportunidades: "move_card",
  fechar_vendas: "move_card",
  visualizar_clientes: "view_clients",
  editar_clientes: "edit_clients",
  ver_dados_pos_venda: "view_post_sale",
  visualizar_descarte: "view_discard",
  excluir_permanente: "delete_permanent",
  enviar_mensagem: "send_message",
  enviar_broadcast: "send_broadcast",
  acessar_grupos: "view_conversations",
  criar_usuario: "create_user",
  editar_usuario: "edit_user",
  excluir_usuario: "delete_user",
};
