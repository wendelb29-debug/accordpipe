import { 
  LayoutDashboard, ShoppingCart, FileText, Activity, DollarSign, 
  FolderOpen, BarChart3, FileSignature, Users, Trash2, 
  MessageSquare, UserCog, Columns3, Package, Settings, Bot,
  type LucideIcon
} from "lucide-react";

export type DataScope = "own" | "team" | "all";

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
  scopable?: boolean;
  /** If set, only these roles can ever have this permission (structural lock) */
  restrictedTo?: string[];
}

export interface PermissionModule {
  key: string;
  label: string;
  icon: LucideIcon;
  group: string;
  permissions: PermissionDef[];
}

/** Structural locks: these permissions can NEVER be overridden via custom_permissions */
export const FIXED_PERMISSION_RULES: Record<string, string[]> = {
  create_catalog_item: ["ceo"],
  manage_tenants_global: ["ceo", "master"],
  manage_billing_plan: ["ceo", "master"],
  manage_tenant_limits: ["ceo", "master"],
  permanent_delete_discarded: ["ceo", "master"],
  add_item_proposal: ["ceo", "master", "administrativo"],
  view_audit_logs: ["ceo", "master", "admin"],
  manage_integrations: ["ceo", "master", "admin"],
  view_billing_plans: ["ceo", "master"],
  create_billing_plans: ["ceo", "master"],
  edit_billing_plans: ["ceo", "master"],
  manage_tenant_subscription: ["ceo", "master"],
  view_tenant_plan_usage: ["ceo", "master", "admin"],
  manage_tenant_users_limit: ["ceo", "master"],
};

export const MODULE_GROUPS = [
  "Geral",
  "CRM / Sales",
  "Workspaces",
  "Atividades",
  "Formulários",
  "Propostas",
  "Catálogo",
  "Contratos",
  "Documentos",
  "Clientes",
  "Financeiro",
  "Relatórios",
  "Accord AI",
  "WhatsApp",
  "Descarte",
  "Usuários e Acessos",
  "Plataforma / Tenant",
  "Performance",
  "Eventos",
] as const;

export const PERMISSION_MODULES: PermissionModule[] = [
  // ===== Geral =====
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "Geral",
    permissions: [
      { key: "view_dashboard", label: "Visualizar Dashboard", description: "Acesso à página de dashboard", scopable: true },
    ],
  },

  // ===== CRM / Sales =====
  {
    key: "crm",
    label: "CRM / Sales",
    icon: ShoppingCart,
    group: "CRM / Sales",
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
      { key: "mark_lead_won", label: "Marcar como Ganho", description: "Marcar lead como ganho" },
      { key: "mark_lead_lost", label: "Marcar como Perdido", description: "Marcar lead como perdido" },
      { key: "change_lead_owner", label: "Alterar Dono", description: "Alterar dono do lead" },
    ],
  },

  // ===== Workspaces =====
  {
    key: "workspaces",
    label: "Workspaces",
    icon: Columns3,
    group: "Workspaces",
    permissions: [
      { key: "view_workspace", label: "Visualizar Workspace", description: "Ver workspaces disponíveis" },
      { key: "create_workspace", label: "Criar Workspace", description: "Criar novos workspaces" },
      { key: "edit_workspace", label: "Editar Workspace", description: "Editar workspaces existentes" },
      { key: "configure_pipeline", label: "Configurar Pipeline", description: "Configurar pipeline de vendas" },
      { key: "edit_columns", label: "Editar Colunas", description: "Editar colunas do kanban" },
      { key: "define_sla", label: "Definir SLA", description: "Definir tempos de SLA das etapas" },
    ],
  },

  // ===== Atividades =====
  {
    key: "atividades",
    label: "Atividades",
    icon: Activity,
    group: "Atividades",
    permissions: [
      { key: "view_activities", label: "Visualizar Atividades", description: "Ver lista de atividades" },
      { key: "create_activities", label: "Criar Atividades", description: "Criar novas atividades" },
    ],
  },

  // ===== Formulários =====
  {
    key: "formularios",
    label: "Formulários",
    icon: FileText,
    group: "Formulários",
    permissions: [
      { key: "view_forms", label: "Visualizar Formulários", description: "Ver formulários criados" },
      { key: "create_forms", label: "Criar Formulários", description: "Criar novos formulários" },
      { key: "edit_forms", label: "Editar Formulários", description: "Editar formulários existentes" },
    ],
  },

  // ===== Propostas =====
  {
    key: "propostas",
    label: "Propostas",
    icon: FileText,
    group: "Propostas",
    permissions: [
      { key: "view_proposal", label: "Visualizar Proposta", description: "Ver propostas criadas", scopable: true },
      { key: "create_proposal", label: "Criar Proposta", description: "Criar novas propostas" },
      { key: "edit_proposal", label: "Editar Proposta", description: "Editar propostas existentes" },
      { key: "delete_proposal", label: "Excluir Proposta", description: "Excluir propostas" },
      { key: "add_item_proposal", label: "Adicionar Item", description: "Adicionar itens a propostas", restrictedTo: ["ceo", "master", "administrativo"] },
      { key: "apply_discount", label: "Aplicar Desconto", description: "Aplicar descontos em propostas" },
      { key: "edit_proposal_value", label: "Editar Valor", description: "Editar valores da proposta" },
      { key: "generate_pdf_proposal", label: "Gerar PDF", description: "Gerar PDF da proposta" },
    ],
  },

  // ===== Catálogo =====
  {
    key: "catalogo",
    label: "Catálogo de Itens",
    icon: Package,
    group: "Catálogo",
    permissions: [
      { key: "catalog_view", label: "Visualizar Catálogo", description: "Ver itens do catálogo" },
      { key: "create_catalog_item", label: "Criar Item", description: "Criar novos itens no catálogo", restrictedTo: ["ceo"] },
      { key: "edit_catalog_item", label: "Editar Item", description: "Editar itens existentes" },
      { key: "delete_catalog_item", label: "Excluir Item", description: "Excluir itens do catálogo" },
      { key: "catalog_activate", label: "Ativar/Inativar Item", description: "Ativar ou inativar itens do catálogo" },
      { key: "catalog_use_in_proposals", label: "Usar em Propostas", description: "Selecionar itens do catálogo em propostas" },
      { key: "catalog_override_price", label: "Sobrescrever Preço", description: "Alterar preço manualmente na proposta" },
    ],
  },

  // ===== Contratos =====
  {
    key: "contratos",
    label: "Contratos",
    icon: FileSignature,
    group: "Contratos",
    permissions: [
      { key: "view_contract", label: "Visualizar Contratos", description: "Ver contratos", scopable: true },
      { key: "create_contract", label: "Criar Contrato", description: "Criar novos contratos" },
      { key: "edit_contract", label: "Editar Contrato", description: "Editar contratos existentes" },
      { key: "send_for_signature", label: "Enviar p/ Assinatura", description: "Enviar contrato para assinatura" },
      { key: "sign_contract", label: "Assinar Contrato", description: "Assinar contratos digitalmente" },
      { key: "cancel_contract", label: "Cancelar Contrato", description: "Cancelar contratos" },
      { key: "cancel_signature_flow", label: "Cancelar Assinatura", description: "Cancelar fluxo de assinatura em andamento" },
    ],
  },

  // ===== Documentos =====
  {
    key: "documentos",
    label: "Documentos",
    icon: FolderOpen,
    group: "Documentos",
    permissions: [
      { key: "view_documents", label: "Visualizar Documentos", description: "Ver documentos do sistema" },
      { key: "upload_documents", label: "Enviar Documentos", description: "Upload de documentos" },
      { key: "delete_documents", label: "Excluir Documentos", description: "Excluir documentos" },
    ],
  },

  // ===== Clientes =====
  {
    key: "clientes",
    label: "Base de Clientes",
    icon: Users,
    group: "Clientes",
    permissions: [
      { key: "view_clients", label: "Visualizar Clientes", description: "Ver base de clientes", scopable: true },
      { key: "edit_clients", label: "Editar Clientes", description: "Editar dados de clientes" },
      { key: "view_post_sale", label: "Ver Pós-Venda", description: "Acessar aba pós-venda" },
    ],
  },

  // ===== Financeiro =====
  {
    key: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    group: "Financeiro",
    permissions: [
      { key: "view_financial", label: "Visualizar Financeiro", description: "Ver módulo financeiro", scopable: true },
      { key: "create_transaction", label: "Criar Transação", description: "Criar novas transações" },
      { key: "edit_transaction", label: "Editar Transação", description: "Editar transações existentes" },
      { key: "delete_transaction", label: "Excluir Transação", description: "Excluir transações" },
      { key: "view_values", label: "Ver Valores", description: "Visualizar valores financeiros" },
      { key: "generate_charge", label: "Gerar Cobrança", description: "Gerar cobranças e boletos" },
      { key: "update_charge", label: "Atualizar Cobrança", description: "Atualizar cobranças existentes" },
      { key: "confirm_payment", label: "Confirmar Pagamento", description: "Confirmar pagamentos recebidos" },
      { key: "manual_payment_settlement", label: "Liquidação Manual", description: "Liquidar pagamentos manualmente" },
    ],
  },

  // ===== Relatórios =====
  {
    key: "relatorios",
    label: "Relatórios",
    icon: BarChart3,
    group: "Relatórios",
    permissions: [
      { key: "view_reports", label: "Visualizar Relatórios", description: "Ver relatórios" },
      { key: "export_reports", label: "Exportar Relatórios", description: "Exportar dados em relatórios" },
    ],
  },

  // ===== Accord AI =====
  {
    key: "accord_ai",
    label: "Accord AI",
    icon: Bot,
    group: "Accord AI",
    permissions: [
      { key: "use_accord_ai", label: "Usar Accord AI", description: "Acessar funcionalidades de IA" },
    ],
  },

  // ===== WhatsApp =====
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: MessageSquare,
    group: "WhatsApp",
    permissions: [
      { key: "view_conversations", label: "Ver Conversas", description: "Visualizar conversas WhatsApp", scopable: true },
      { key: "send_message", label: "Enviar Mensagem", description: "Enviar mensagens WhatsApp" },
      { key: "assign_conversation", label: "Atribuir Conversa", description: "Atribuir conversas a usuários" },
      { key: "transfer_conversation", label: "Transferir Conversa", description: "Transferir conversas entre usuários" },
      { key: "send_broadcast", label: "Enviar Broadcast", description: "Disparar mensagens em massa" },
    ],
  },

  // ===== Descarte =====
  {
    key: "descarte",
    label: "Descarte",
    icon: Trash2,
    group: "Descarte",
    permissions: [
      { key: "view_discard", label: "Visualizar Descarte", description: "Ver leads descartados" },
      { key: "delete_permanent", label: "Excluir Permanente", description: "Excluir leads permanentemente" },
      { key: "permanent_delete_discarded", label: "Exclusão Permanente do Descarte", description: "Excluir permanentemente leads descartados", restrictedTo: ["ceo", "master"] },
    ],
  },

  // ===== Usuários e Acessos =====
  {
    key: "usuarios",
    label: "Gestão de Acesso",
    icon: UserCog,
    group: "Usuários e Acessos",
    permissions: [
      { key: "view_users", label: "Visualizar Usuários", description: "Ver lista de usuários" },
      { key: "create_user", label: "Criar Usuário", description: "Criar novos usuários no sistema" },
      { key: "edit_user", label: "Editar Usuário", description: "Editar dados de usuários" },
      { key: "delete_user", label: "Excluir Usuário", description: "Excluir usuários do sistema" },
      { key: "manage_permissions", label: "Gerenciar Permissões", description: "Gerenciar permissões de usuários" },
      { key: "manage_roles", label: "Gerenciar Perfis", description: "Alterar perfis de acesso dos usuários" },
    ],
  },

  // ===== Plataforma / Tenant =====
  {
    key: "plataforma",
    label: "Plataforma / Tenant",
    icon: Settings,
    group: "Plataforma / Tenant",
    permissions: [
      { key: "manage_tenants_global", label: "Gestão Global de Tenants", description: "Criar e gerenciar tenants", restrictedTo: ["ceo", "master"] },
      { key: "manage_billing_plan", label: "Alterar Plano", description: "Alterar plano de assinatura do tenant", restrictedTo: ["ceo", "master"] },
      { key: "manage_tenant_limits", label: "Alterar Limites", description: "Alterar limites de usuários do tenant", restrictedTo: ["ceo", "master"] },
      { key: "manage_integrations", label: "Gerenciar Integrações", description: "Configurar integrações externas", restrictedTo: ["ceo", "master", "admin"] },
      { key: "view_audit_logs", label: "Ver Logs de Auditoria", description: "Acessar logs de auditoria do sistema", restrictedTo: ["ceo", "master", "admin"] },
      { key: "view_billing_plans", label: "Ver Planos", description: "Visualizar planos de assinatura", restrictedTo: ["ceo", "master"] },
      { key: "create_billing_plans", label: "Criar Planos", description: "Criar novos planos", restrictedTo: ["ceo", "master"] },
      { key: "edit_billing_plans", label: "Editar Planos", description: "Editar planos existentes", restrictedTo: ["ceo", "master"] },
      { key: "manage_tenant_subscription", label: "Gerenciar Assinatura", description: "Alterar assinatura de tenants", restrictedTo: ["ceo", "master"] },
      { key: "view_tenant_plan_usage", label: "Ver Consumo do Plano", description: "Visualizar uso do plano de um tenant", restrictedTo: ["ceo", "master", "admin"] },
      { key: "manage_tenant_users_limit", label: "Gerenciar Limite Usuários", description: "Ajustar limites de usuários por tenant", restrictedTo: ["ceo", "master"] },
    ],
  },

  // ===== Performance =====
  {
    key: "performance",
    label: "Accord Performance",
    icon: Activity,
    group: "Performance",
    permissions: [
      { key: "view_performance_module", label: "Visualizar Performance", description: "Acessar módulo de performance", scopable: true },
      { key: "view_team_performance", label: "Ver Performance do Time", description: "Ver performance da equipe", scopable: true },
      { key: "view_all_performance", label: "Ver Performance Global", description: "Ver performance de todos", scopable: true },
      { key: "manage_team_goals", label: "Gerenciar Metas do Time", description: "Definir e editar metas de equipe" },
      { key: "manage_individual_goals", label: "Gerenciar Metas Individuais", description: "Definir e editar metas individuais" },
      { key: "create_feedback", label: "Registrar Feedback", description: "Registrar feedbacks one-on-one" },
      { key: "view_feedback", label: "Ver Feedbacks", description: "Visualizar feedbacks registrados", scopable: true },
      { key: "generate_ai_action_plan", label: "Gerar Plano IA", description: "Gerar plano de ação com inteligência artificial" },
    ],
  },

  // ===== Eventos =====
  {
    key: "eventos",
    label: "Eventos",
    icon: Activity,
    group: "Eventos",
    permissions: [
      { key: "view_events", label: "Visualizar Eventos", description: "Acesso à agenda de eventos", scopable: true },
      { key: "create_events", label: "Criar Eventos", description: "Criar novos eventos" },
      { key: "edit_events", label: "Editar Eventos", description: "Editar eventos existentes" },
      { key: "delete_events", label: "Excluir Eventos", description: "Excluir eventos" },
      { key: "confirm_event_attendance", label: "Confirmar Presença", description: "Confirmar presença em eventos" },
      { key: "manage_event_notifications", label: "Gerenciar Notificações", description: "Gerenciar notificações de eventos" },
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
  "/configuracoes/auditoria": "view_audit_logs",
  "/performance": "view_performance_module",
  "/planos": "view_billing_plans",
  "/eventos": "view_events",
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
  visualizar_relatorio_clientes: "view_reports",
  exportar_relatorio_clientes: "export_reports",
  visualizar_relatorio_crm: "view_reports",
  exportar_relatorio_crm: "export_reports",
};

/** Check if a permission is structurally locked to specific roles */
export function isPermissionLocked(permKey: string, userRole: string | null): boolean {
  const allowed = FIXED_PERMISSION_RULES[permKey];
  if (!allowed) return false;
  if (!userRole) return true;
  return !allowed.includes(userRole);
}
