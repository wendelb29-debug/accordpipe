import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export type AuditAction =
  | "login" | "logout"
  | "create" | "update" | "delete" | "view"
  | "export" | "import"
  | "move" | "assign" | "duplicate"
  | "permission_grant" | "permission_revoke"
  | "send" | "schedule" | "cancel";

interface LogActionParams {
  action: AuditAction;
  target_type: string;
  target_id?: string;
  target_name?: string;
  page_title?: string;
  metadata?: Record<string, any>;
}

interface LogExportParams extends Omit<LogActionParams, "action"> {
  file: Blob | File;
  filename: string;
  record_count?: number;
}

/**
 * Hook for recording audit events.
 * Automatically captures: user, tenant, page, device, timestamp.
 * Never throws — auditing must not break the feature.
 */
export function useAuditLog() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const companyId = useActiveCompanyId();

  const baseDetails = useCallback(() => ({
    page_path: location.pathname,
    page_search: location.search || null,
    page_title: typeof document !== "undefined" ? document.title : null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    timestamp_client: new Date().toISOString(),
  }), [location.pathname, location.search]);

  const logAction = useCallback(async (params: LogActionParams) => {
    if (!user) return;
    try {
      await (supabase as any).rpc("log_audit", {
        _user_id: user.id,
        _user_name: profile?.name || user.email || "Desconhecido",
        _action: params.action,
        _target_type: params.target_type,
        _target_id: params.target_id || null,
        _details: {
          ...baseDetails(),
          target_name: params.target_name,
          page_title: params.page_title || baseDetails().page_title,
          ...(params.metadata || {}),
        },
        _servidor_id: companyId,
      });
    } catch (err) {
      console.error("[useAuditLog] logAction error:", err);
    }
  }, [user, profile, companyId, baseDetails]);

  const logExport = useCallback(async (params: LogExportParams) => {
    if (!user || !companyId) return null;
    try {
      const ts = new Date();
      const month = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}`;
      const safeFilename = params.filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const storagePath = `${companyId}/${month}/${ts.getTime()}-${safeFilename}`;

      const { error: uploadError } = await supabase.storage
        .from("audit-exports")
        .upload(storagePath, params.file, {
          contentType: params.file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("[useAuditLog] upload error:", uploadError);
      }

      const buffer = await params.file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      await (supabase as any).rpc("log_audit", {
        _user_id: user.id,
        _user_name: profile?.name || user.email || "Desconhecido",
        _action: "export",
        _target_type: params.target_type,
        _target_id: params.target_id || null,
        _details: {
          ...baseDetails(),
          target_name: params.target_name,
          record_count: params.record_count,
          export_file: uploadError ? null : {
            path: storagePath,
            bucket: "audit-exports",
            filename: params.filename,
            size: params.file.size,
            mime_type: params.file.type,
            sha256: hash,
          },
          ...(params.metadata || {}),
        },
        _servidor_id: companyId,
      });

      return uploadError ? null : storagePath;
    } catch (err) {
      console.error("[useAuditLog] logExport error:", err);
      return null;
    }
  }, [user, profile, companyId, baseDetails]);

  const getExportDownloadUrl = useCallback(async (path: string) => {
    const { data, error } = await supabase.storage
      .from("audit-exports")
      .createSignedUrl(path, 60 * 60 * 24);
    if (error) throw error;
    return data?.signedUrl;
  }, []);

  return { logAction, logExport, getExportDownloadUrl };
}
