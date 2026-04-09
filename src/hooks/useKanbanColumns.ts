import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface KanbanColumnDynamic {
  id: string;
  workspace_id: string;
  name: string;
  position: number;
  sla_days: number;
  color: string;
  icon: string;
}

export function useKanbanColumns(workspaceId: string | null | undefined) {
  const [columns, setColumns] = useState<KanbanColumnDynamic[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchColumns = useCallback(async () => {
    if (!workspaceId) {
      setColumns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("kanban_columns")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching kanban columns:", error);
    } else {
      setColumns((data || []) as KanbanColumnDynamic[]);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  // Convert dynamic columns to stage-like objects for compatibility
  const dynamicStages = columns.map((col) => ({
    id: col.id,
    title: col.name,
    daysLimit: col.sla_days > 0 ? `${col.sla_days}d` : "",
    color: `bg-[${col.color}]`,
    rawColor: col.color,
    sla_days: col.sla_days,
  }));

  return { columns, dynamicStages, loading, refresh: fetchColumns };
}
