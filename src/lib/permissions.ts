import { 
  LayoutDashboard, ShoppingCart, FileText, Activity, DollarSign, 
  FolderOpen, BarChart3, FileSignature, Briefcase, Users, Trash2, 
  MessageSquare, UserCog,
  type LucideIcon
} from "lucide-react";

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
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
      { key: "visualizar_dashboard", label: "Visualizar Dashboard", description: "Acesso à página de dashboard" },
    ],
  },
  {
    key: "vendas",
    label: "Accord Sales",
    icon: ShoppingCart,
    permissions: [
      { key: "visualizar_vendas", label: "Visualizar Vendas", description: "Ver módulo de vendas/CRM" },
      { key: "editar_vendas", label: "Editar Vendas", description: "Editar dados de vendas e leads" },
      { key: "excluir_vendas", label: "Excluir Vendas", description: "Excluir registros de vendas" },
    ],
  },
  {
    key: "formularios",
    label: "Formulários",
    icon: FileText,
    permissions: [
      { key: "visualizar_formularios", label: "Visualizar Formulários", description: "Ver formulários criados" },
      { key: "criar_formularios", label: "Criar Formulários", description: "Criar novos formulários" },
      { key: "editar_formularios", label: "Editar Formulários", description: "Editar formulários existentes" },
    ],
  },
  {
    key: "atividades",
    label: "Atividades",
    icon: Activity,
    permissions: [
      { key: "visualizar_atividades", label: "Visualizar Atividades", description: "Ver lista de atividades" },
      { key: "criar_atividades", label: "Criar Atividades", description: "Criar novas atividades" },
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    permissions: [
      { key: "visualizar_financeiro", label: "Visualizar Financeiro", description: "Ver módulo financeiro" },
      { key: "editar_financeiro", label: "Editar Financeiro", description: "Editar dados financeiros" },
      { key: "acessar_boletos", label: "Acessar Boletos", description: "Acessar boletos e cobranças" },
    ],
  },
  {
    key: "documentos",
    label: "Documentos",
    icon: FolderOpen,
    permissions: [
      { key: "visualizar_documentos", label: "Visualizar Documentos", description: "Ver documentos do sistema" },
      { key: "enviar_documentos", label: "Enviar Documentos", description: "Upload de documentos" },
      { key: "excluir_documentos", label: "Excluir Documentos", description: "Excluir documentos" },
    ],
  },
  {
    key: "relatorios",
    label: "Relatórios",
    icon: BarChart3,
    permissions: [
      { key: "visualizar_relatorios", label: "Visualizar Relatórios", description: "Ver relatórios" },
      { key: "exportar_relatorios", label: "Exportar Relatórios", description: "Exportar dados em relatórios" },
      { key: "visualizar_relatorio_clientes", label: "Relatório de Clientes", description: "Ver relatório da base de clientes" },
      { key: "exportar_relatorio_clientes", label: "Exportar Relatório de Clientes", description: "Exportar relatório da base de clientes" },
      { key: "visualizar_relatorio_crm", label: "Relatório CRM", description: "Ver relatório de vendas/CRM" },
      { key: "exportar_relatorio_crm", label: "Exportar Relatório CRM", description: "Exportar relatório de vendas/CRM" },
    ],
  },
  {
    key: "contratos",
    label: "Contratos",
    icon: FileSignature,
    permissions: [
      { key: "visualizar_contratos", label: "Visualizar Contratos", description: "Ver contratos" },
      { key: "criar_contratos", label: "Criar Contratos", description: "Criar novos contratos" },
      { key: "assinar_contratos", label: "Assinar Contratos", description: "Assinar contratos digitalmente" },
    ],
  },
  {
    key: "pipeline",
    label: "Pipeline de Vendas",
    icon: Briefcase,
    permissions: [
      { key: "visualizar_pipeline", label: "Visualizar Pipeline", description: "Ver pipeline de oportunidades" },
      { key: "mover_oportunidades", label: "Mover Oportunidades", description: "Arrastar cards entre etapas" },
      { key: "fechar_vendas", label: "Fechar Vendas", description: "Marcar oportunidades como ganhas" },
    ],
  },
  {
    key: "clientes",
    label: "Base de Clientes",
    icon: Users,
    permissions: [
      { key: "visualizar_clientes", label: "Visualizar Clientes", description: "Ver base de clientes" },
      { key: "editar_clientes", label: "Editar Clientes", description: "Editar dados de clientes" },
      { key: "ver_dados_pos_venda", label: "Ver Dados Pós-Venda", description: "Acessar aba pós-venda" },
    ],
  },
  {
    key: "descarte",
    label: "Descarte",
    icon: Trash2,
    permissions: [
      { key: "visualizar_descarte", label: "Visualizar Descarte", description: "Ver leads descartados" },
      { key: "excluir_permanente", label: "Excluir Permanente", description: "Excluir leads permanentemente" },
    ],
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: MessageSquare,
    permissions: [
      { key: "enviar_mensagem", label: "Enviar Mensagem", description: "Enviar mensagens WhatsApp" },
      { key: "enviar_broadcast", label: "Enviar Broadcast", description: "Disparar mensagens em massa" },
      { key: "acessar_grupos", label: "Acessar Grupos", description: "Gerenciar grupos WhatsApp" },
    ],
  },
  {
    key: "usuarios",
    label: "Gestão de Acesso",
    icon: UserCog,
    permissions: [
      { key: "criar_usuario", label: "Criar Usuário", description: "Criar novos usuários no sistema" },
      { key: "editar_usuario", label: "Editar Usuário", description: "Editar dados de usuários" },
      { key: "excluir_usuario", label: "Excluir Usuário", description: "Excluir usuários do sistema" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.key));

// Map permission to required route access
export const ROUTE_PERMISSIONS: Record<string, string> = {
  "/home": "visualizar_dashboard",
  "/dashboard": "visualizar_dashboard",
  "/atendimento": "visualizar_vendas",
  "/formularios": "visualizar_formularios",
  "/atividades": "visualizar_atividades",
  "/financeiro": "visualizar_financeiro",
  "/boletos": "acessar_boletos",
  "/documentos": "visualizar_documentos",
  "/relatorios": "visualizar_relatorios",
  "/contratos": "visualizar_contratos",
  "/gestao-vendas": "visualizar_pipeline",
  "/cadastrados": "visualizar_clientes",
  "/clientes": "visualizar_clientes",
  "/descarte": "visualizar_descarte",
  "/configuracoes/usuarios": "criar_usuario",
  "/configuracoes/assinaturas": "criar_usuario",
  "/empresas": "editar_clientes",
  "/accord-stack": "criar_usuario",
};
