/**
 * Shared helpers/labels for the audit UI.
 * Extracted from AuditLogs.tsx for reuse in the new Analytics > Auditoria tab.
 */

export const ACTION_LABELS: Record<string, string> = {
  create_user: "Criar Usuário", edit_user: "Editar Usuário", delete_user: "Excluir Usuário",
  change_role: "Alterar Perfil", change_permissions: "Alterar Permissões", change_data_scope: "Alterar Escopo",
  create_workspace: "Criar Workspace", edit_workspace: "Editar Workspace", delete_workspace: "Excluir Workspace",
  create_lead: "Criar Lead", edit_lead: "Editar Lead", delete_lead: "Excluir Lead",
  change_lead_owner: "Alterar Dono", mark_lead_won: "Marcar Ganho", mark_lead_lost: "Marcar Perdido",
  move_lead_stage: "Mover Etapa", create_proposal: "Criar Proposta", edit_proposal: "Editar Proposta",
  delete_proposal: "Excluir Proposta", apply_discount: "Aplicar Desconto", change_final_price: "Alterar Valor",
  create_contract: "Criar Contrato", send_signature: "Enviar Assinatura", cancel_signature: "Cancelar Assinatura",
  settle_payment: "Liquidar Pagamento", create_transaction: "Criar Cobrança", edit_transaction: "Editar Cobrança",
  delete_transaction: "Excluir Cobrança", change_integration: "Alterar Integração",
  change_tenant_limits: "Alterar Limites", change_billing_plan: "Alterar Plano", manage_tenant: "Gestão Tenant",
};

export const TARGET_LABELS: Record<string, string> = {
  user: "Usuário", role: "Perfil", permission: "Permissão", workspace: "Workspace",
  lead: "Lead", proposal: "Proposta", contract: "Contrato", transaction: "Cobrança",
  integration: "Integração", tenant: "Tenant", document: "Documento", company: "Empresa",
  conversation: "Conversa", contact: "Contato", team: "Equipe", automation: "Automação",
};

export const MODULE_LABELS: Record<string, string> = {
  crm: "CRM", inbox: "Atendimento", automation: "Automação", contracts: "Contratos",
  fintech: "Financeiro", proposals: "Propostas", clients: "Clientes", tenants: "Tenants",
  users: "Usuários", integrations: "Integrações", settings: "Configurações", ai: "IA",
};

export const ACTION_KIND: Record<string, { label: string; cls: string }> = {
  create:            { label: "CRIOU",      cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  edit:              { label: "EDITOU",     cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  update:            { label: "EDITOU",     cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  view:              { label: "VISUALIZOU", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  export:            { label: "EXPORTOU",   cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  delete:            { label: "EXCLUIU",    cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  move:              { label: "MOVEU",      cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
  permission:        { label: "PERMISSÃO",  cls: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  change_role:       { label: "PERMISSÃO",  cls: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  change_permissions:{ label: "PERMISSÃO",  cls: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  login:             { label: "LOGIN",      cls: "bg-muted text-muted-foreground" },
  logout:            { label: "LOGOUT",     cls: "bg-muted text-muted-foreground" },
  mark_lead_won:     { label: "GANHO",      cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  mark_lead_lost:    { label: "PERDIDO",    cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  settle_payment:    { label: "LIQUIDOU",   cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  send_signature:    { label: "ENVIOU",     cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  cancel_signature:  { label: "CANCELOU",   cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  apply_discount:    { label: "DESCONTO",   cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
};

export function getActionStyle(action: string) {
  if (ACTION_KIND[action]) return ACTION_KIND[action];
  const prefix = action.split("_")[0];
  if (ACTION_KIND[prefix]) return ACTION_KIND[prefix];
  if (action.includes("permission") || action.includes("role")) return ACTION_KIND.permission;
  return { label: action.toUpperCase().replace(/_/g, " ").slice(0, 14), cls: "bg-muted text-muted-foreground" };
}

const SENSITIVE_PREFIXES = ["delete_", "export", "change_permissions", "change_role", "change_data_scope"];
export function isSensitive(action: string) {
  return SENSITIVE_PREFIXES.some(p => action.startsWith(p) || action === p);
}

export const STATUS_STYLE: Record<string, string> = {
  success:    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  ok:         "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning:    "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  error:      "bg-red-500/15 text-red-600 dark:text-red-400",
  failed:     "bg-red-500/15 text-red-600 dark:text-red-400",
  pending:    "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  cancelled:  "bg-muted text-muted-foreground",
};

export const SEVERITY_STYLE: Record<string, string> = {
  low:      "bg-muted text-muted-foreground",
  info:     "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  medium:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  high:     "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  critical: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const USER_PALETTE = [
  "from-violet-500 to-violet-700",
  "from-emerald-500 to-emerald-700",
  "from-blue-500 to-blue-700",
  "from-pink-500 to-pink-700",
  "from-amber-500 to-amber-700",
  "from-cyan-500 to-cyan-700",
  "from-fuchsia-500 to-fuchsia-700",
  "from-indigo-500 to-indigo-700",
];

export function userColor(userId: string | null) {
  if (!userId) return USER_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return USER_PALETTE[hash % USER_PALETTE.length];
}

export function initials(name: string | null) {
  if (!name) return "··";
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

export function maskIp(ip: string | null) {
  if (!ip) return "—";
  return ip.replace(/^(\d+\.)\d+\.\d+(\.\d+)$/, "$1xxx.xxx$2");
}

export function formatDuration(ms: number | null | undefined) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  return `${m}m${rs.toString().padStart(2, "0")}s`;
}
