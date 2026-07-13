import { supabase } from "@/integrations/supabase/client";

const DEFAULT_CADASTRO_COLUMNS = [
  { name: "Aguardando Conferência", position: 0, color: "#F59E0B", icon: "clock", sla_days: 3 },
  { name: "Conferindo Dados", position: 1, color: "#3B82F6", icon: "clipboard-list", sla_days: 2 },
  { name: "Aguardando Documentos", position: 2, color: "#EF4444", icon: "file-warning", sla_days: 5 },
  { name: "Aguardando Assinatura", position: 3, color: "#8B5CF6", icon: "file-signature", sla_days: 3 },
  { name: "Pronto para Cadastro", position: 4, color: "#10B981", icon: "check-circle", sla_days: 1 },
  { name: "Cadastro Concluído", position: 5, color: "#22C55E", icon: "sparkles", sla_days: 0, is_final: true },
];

/**
 * Finds or creates the "Cadastro" workspace for a given tenant.
 * Returns the workspace id and the first kanban column id.
 */
export async function getOrCreateCadastroWorkspace(servidorId: string, createdByUserId?: string | null): Promise<{
  workspaceId: string;
  firstColumnId: string;
} | null> {
  // Try to find existing cadastro workspace
  const { data: existing } = await supabase
    .from("workspaces")
    .select("id")
    .eq("servidor_id", servidorId)
    .eq("type", "cadastro")
    .limit(1)
    .maybeSingle();

  let workspaceId: string;

  if (existing) {
    workspaceId = existing.id;
  } else {
    // Create the workspace
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .insert({
        name: "Cadastro",
        servidor_id: servidorId,
        type: "cadastro",
        color: "#10B981",
        icon: "clipboard-list",
        is_default: false,
        created_by_user_id: createdByUserId || null,
      } as any)
      .select("id")
      .single();

    if (wsErr || !ws) {
      console.error("Error creating Cadastro workspace:", wsErr);
      return null;
    }
    workspaceId = ws.id;

    // Create default columns
    const columnsToInsert = DEFAULT_CADASTRO_COLUMNS.map((col) => ({
      workspace_id: workspaceId,
      name: col.name,
      position: col.position,
      color: col.color,
      icon: col.icon,
      sla_days: col.sla_days,
      is_final: (col as any).is_final || false,
      is_default: col.position === 0,
    }));

    await supabase.from("kanban_columns").insert(columnsToInsert as any);
  }

  // Get first column
  const { data: cols } = await supabase
    .from("kanban_columns")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true })
    .limit(1);

  if (!cols || cols.length === 0) {
    console.error("Cadastro workspace has no columns");
    return null;
  }

  return { workspaceId, firstColumnId: cols[0].id };
}

/**
 * Check if a workspace is of type "cadastro"
 */
export async function isCadastroWorkspace(workspaceId: string): Promise<boolean> {
  const { data } = await supabase
    .from("workspaces")
    .select("type")
    .eq("id", workspaceId)
    .maybeSingle();
  return data?.type === "cadastro";
}

/**
 * Resolves where a lead should land when marked as WON, based on the
 * origin workspace's `won_destination` / `won_target_workspace_id` config.
 *
 * NULL / 'cadastro' → keep legacy behavior (Cadastro workspace).
 * 'workspace'       → move to the configured workspace (same tenant, first column).
 * 'base_clientes'   → do NOT move; stay in current workspace/stage.
 */
export type WonDestination =
  | { kind: "cadastro"; workspaceId: string; firstColumnId: string; label: string }
  | { kind: "workspace"; workspaceId: string; firstColumnId: string; label: string }
  | { kind: "base_clientes"; label: string };

export async function resolveWonDestination(
  lead: { id: string; servidor_id: string; workspace_id: string | null },
  createdByUserId?: string | null,
): Promise<WonDestination | null> {
  // Load origin workspace's won-destination config
  let wonDestination: string | null = null;
  let wonTargetId: string | null = null;
  if (lead.workspace_id) {
    const { data: originWs } = await supabase
      .from("workspaces")
      .select("won_destination, won_target_workspace_id")
      .eq("id", lead.workspace_id)
      .maybeSingle();
    wonDestination = (originWs as any)?.won_destination ?? null;
    wonTargetId = (originWs as any)?.won_target_workspace_id ?? null;
  }

  // Default (null or explicit 'cadastro'): legacy Cadastro workspace behavior
  if (!wonDestination || wonDestination === "cadastro") {
    const cad = await getOrCreateCadastroWorkspace(lead.servidor_id, createdByUserId);
    if (!cad) return null;
    return { kind: "cadastro", workspaceId: cad.workspaceId, firstColumnId: cad.firstColumnId, label: "Cadastro" };
  }

  if (wonDestination === "base_clientes") {
    return { kind: "base_clientes", label: "Base de Clientes" };
  }

  if (wonDestination === "workspace") {
    if (!wonTargetId) {
      console.warn("[resolveWonDestination] won_destination=workspace but no target set; falling back to Cadastro");
      const cad = await getOrCreateCadastroWorkspace(lead.servidor_id, createdByUserId);
      if (!cad) return null;
      return { kind: "cadastro", workspaceId: cad.workspaceId, firstColumnId: cad.firstColumnId, label: "Cadastro" };
    }
    const { data: target } = await supabase
      .from("workspaces")
      .select("id, name, servidor_id")
      .eq("id", wonTargetId)
      .maybeSingle();

    if (!target || target.servidor_id !== lead.servidor_id) {
      console.warn("[resolveWonDestination] target workspace missing or from another tenant; falling back to Cadastro", { wonTargetId });
      const cad = await getOrCreateCadastroWorkspace(lead.servidor_id, createdByUserId);
      if (!cad) return null;
      return { kind: "cadastro", workspaceId: cad.workspaceId, firstColumnId: cad.firstColumnId, label: "Cadastro" };
    }

    const { data: cols } = await supabase
      .from("kanban_columns")
      .select("id")
      .eq("workspace_id", target.id)
      .order("position", { ascending: true })
      .limit(1);

    if (!cols || cols.length === 0) {
      console.warn("[resolveWonDestination] target workspace has no columns; falling back to Cadastro", { wonTargetId });
      const cad = await getOrCreateCadastroWorkspace(lead.servidor_id, createdByUserId);
      if (!cad) return null;
      return { kind: "cadastro", workspaceId: cad.workspaceId, firstColumnId: cad.firstColumnId, label: "Cadastro" };
    }

    return { kind: "workspace", workspaceId: target.id, firstColumnId: cols[0].id, label: target.name };
  }

  // Unknown value → legacy
  const cad = await getOrCreateCadastroWorkspace(lead.servidor_id, createdByUserId);
  if (!cad) return null;
  return { kind: "cadastro", workspaceId: cad.workspaceId, firstColumnId: cad.firstColumnId, label: "Cadastro" };
}

