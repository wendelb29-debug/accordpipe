import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useAuth } from "@/contexts/AuthContext";

export interface AuditLogRow {
  id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  servidor_id: string | null;
  created_at: string;
  actor_type: string | null;
  agent_id: string | null;
  module: string | null;
  event_type: string | null;
  title: string | null;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: string | null;
  severity: string | null;
  source: string | null;
  conversation_id: string | null;
  contact_id: string | null;
  channel_id: string | null;
  team_id: string | null;
  automation_id: string | null;
  resource_id: string | null;
  integration_id: string | null;
  request_id: string | null;
  trace_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  ip_address_masked: string | null;
  device_type: string | null;
  browser: string | null;
  app_version: string | null;
  environment: string | null;
}

export interface AuditFiltersState {
  search: string;
  period: "today" | "yesterday" | "7d" | "15d" | "30d" | "this_month" | "last_month" | "custom" | "all";
  from?: Date;
  to?: Date;
  eventTypes: string[];
  modules: string[];
  sources: string[];
  actorIds: string[];
  agentIds: string[];
  channelIds: string[];
  statuses: string[];
  severities: string[];
  hasError?: boolean;
  hasChanges?: boolean;
}

export const DEFAULT_FILTERS: AuditFiltersState = {
  search: "",
  period: "30d",
  eventTypes: [],
  modules: [],
  sources: [],
  actorIds: [],
  agentIds: [],
  channelIds: [],
  statuses: [],
  severities: [],
};

export type AuditSort = { column: "created_at" | "action" | "user_name" | "target_type" | "status" | "duration_ms"; direction: "asc" | "desc" };

function periodRange(f: AuditFiltersState): { from?: Date; to?: Date } {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  switch (f.period) {
    case "all": return {};
    case "today": return { from: start, to: now };
    case "yesterday": {
      const y = new Date(start); y.setDate(y.getDate() - 1);
      const end = new Date(start); end.setMilliseconds(-1);
      return { from: y, to: end };
    }
    case "7d": { const d = new Date(start); d.setDate(d.getDate() - 6); return { from: d, to: now }; }
    case "15d": { const d = new Date(start); d.setDate(d.getDate() - 14); return { from: d, to: now }; }
    case "30d": { const d = new Date(start); d.setDate(d.getDate() - 29); return { from: d, to: now }; }
    case "this_month": { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: d, to: now }; }
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 1); to.setMilliseconds(-1);
      return { from, to };
    }
    case "custom": return { from: f.from, to: f.to };
  }
}

interface UseAuditLogsOptions {
  pageSize?: number;
}

export function useAuditLogs(filters: AuditFiltersState, options: UseAuditLogsOptions = {}) {
  const activeCompanyId = useActiveCompanyId();
  const { isMaster } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options.pageSize ?? 50);
  const [sort, setSort] = useState<AuditSort>({ column: "created_at", direction: "desc" });
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);
  const [newEventsCount, setNewEventsCount] = useState(0);
  const topCreatedAtRef = useRef<string | null>(null);

  // debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(t);
  }, [filters.search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.period, filters.from, filters.to, filters.eventTypes.join(","), filters.modules.join(","), filters.sources.join(","), filters.actorIds.join(","), filters.agentIds.join(","), filters.channelIds.join(","), filters.statuses.join(","), filters.severities.join(","), filters.hasError, filters.hasChanges]);

  const buildQuery = useCallback(() => {
    let q = supabase.from("audit_logs").select("*", { count: "exact" });

    if (!isMaster && activeCompanyId) q = q.eq("servidor_id", activeCompanyId);

    const { from, to } = periodRange(filters);
    if (from) q = q.gte("created_at", from.toISOString());
    if (to) q = q.lte("created_at", to.toISOString());

    if (debouncedSearch.trim()) {
      const s = debouncedSearch.trim().replace(/[,()]/g, "");
      q = q.or([
        `user_name.ilike.%${s}%`,
        `action.ilike.%${s}%`,
        `target_type.ilike.%${s}%`,
        `target_id.ilike.%${s}%`,
        `title.ilike.%${s}%`,
        `description.ilike.%${s}%`,
        `event_type.ilike.%${s}%`,
        `error_message.ilike.%${s}%`,
      ].join(","));
    }
    if (filters.eventTypes.length) q = q.in("event_type", filters.eventTypes);
    if (filters.modules.length) q = q.in("module", filters.modules);
    if (filters.sources.length) q = q.in("source", filters.sources);
    if (filters.actorIds.length) q = q.in("user_id", filters.actorIds);
    if (filters.agentIds.length) q = q.in("agent_id", filters.agentIds);
    if (filters.channelIds.length) q = q.in("channel_id", filters.channelIds);
    if (filters.statuses.length) q = q.in("status", filters.statuses);
    if (filters.severities.length) q = q.in("severity", filters.severities);
    if (filters.hasError) q = q.not("error_message", "is", null);

    q = q.order(sort.column, { ascending: sort.direction === "asc", nullsFirst: false });
    return q;
  }, [activeCompanyId, isMaster, debouncedSearch, filters, sort]);

  const fetchPage = useCallback(async (silent = false) => {
    if (!activeCompanyId && !isMaster) return;
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const q = buildQuery().range(from, to);
      const { data, count, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as any);
      setTotal(count ?? 0);
      setLastFetchAt(new Date());
      topCreatedAtRef.current = data && data.length > 0 ? (data[0] as any).created_at : topCreatedAtRef.current;
      setNewEventsCount(0);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar auditoria");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildQuery, page, pageSize, activeCompanyId, isMaster]);

  useEffect(() => { fetchPage(false); }, [fetchPage]);

  // detect new events silently
  const pollNew = useCallback(async () => {
    if (!topCreatedAtRef.current) return;
    if (!activeCompanyId && !isMaster) return;
    try {
      let q = supabase.from("audit_logs").select("id", { count: "exact", head: true });
      if (!isMaster && activeCompanyId) q = q.eq("servidor_id", activeCompanyId);
      q = q.gt("created_at", topCreatedAtRef.current);
      const { count } = await q;
      if (typeof count === "number") setNewEventsCount(count);
    } catch { /* silent */ }
  }, [activeCompanyId, isMaster]);

  return {
    rows, total, loading, refreshing, error,
    page, setPage, pageSize, setPageSize,
    sort, setSort,
    lastFetchAt, newEventsCount,
    refresh: () => fetchPage(true),
    pollNew,
    loadNewEvents: () => fetchPage(false),
  };
}
