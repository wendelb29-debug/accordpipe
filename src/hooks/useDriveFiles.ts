import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "sonner";

export interface DriveFile {
  id: string;
  servidor_id: string;
  parent_id: string | null;
  name: string;
  type: "file" | "folder";
  file_url: string | null;
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  status: string;
  contract_id: string | null;
  created_by_user_id: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useDriveFiles(parentId: string | null) {
  const { profile, isMaster, isCeo } = useAuth();
  const companyId = useActiveCompanyId();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = isMaster || isCeo || (profile as any)?.is_master;

  const fetchFiles = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    let query = supabase
      .from("drive_files")
      .select("*")
      .eq("servidor_id", companyId)
      .order("type", { ascending: true })
      .order("name", { ascending: true });

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Drive fetch error:", error);
      toast.error("Erro ao carregar arquivos");
    }
    setFiles((data as DriveFile[]) || []);
    setLoading(false);
  }, [companyId, parentId]);

  useEffect(() => {
    if (companyId) fetchFiles();
  }, [fetchFiles]);

  const createFolder = async (name: string) => {
    if (!companyId) return null;
    const { data, error } = await supabase
      .from("drive_files")
      .insert({
        servidor_id: companyId,
        parent_id: parentId,
        name,
        type: "folder",
        created_by_user_id: profile.user_id,
        created_by_name: profile.name,
      } as any)
      .select("id")
      .single();
    if (error) {
      toast.error("Erro ao criar pasta: " + error.message);
      return null;
    }
    toast.success("Pasta criada!");
    await fetchFiles();
    return data?.id;
  };

  const uploadFile = async (file: File) => {
    if (!companyId) return null;
    const filePath = `${companyId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("contract-pdfs")
      .upload(filePath, file, { contentType: file.type });
    if (uploadErr) {
      toast.error("Erro no upload: " + uploadErr.message);
      return null;
    }
    const { data: signedData } = await supabase.storage.from("contract-pdfs").createSignedUrl(filePath, 86400);

    const { data, error } = await supabase
      .from("drive_files")
      .insert({
        servidor_id: companyId,
        parent_id: parentId,
        name: file.name,
        type: "file",
        file_url: signedData?.signedUrl || "",
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        created_by_user_id: profile.user_id,
        created_by_name: profile.name,
      } as any)
      .select("id")
      .single();

    if (error) {
      toast.error("Erro ao registrar arquivo: " + error.message);
      return null;
    }
    toast.success("Arquivo enviado!");
    await fetchFiles();
    return data?.id;
  };

  const renameFile = async (fileId: string, newName: string) => {
    const { error } = await supabase
      .from("drive_files")
      .update({ name: newName } as any)
      .eq("id", fileId);
    if (error) {
      toast.error("Erro ao renomear");
      return;
    }
    toast.success("Renomeado!");
    await fetchFiles();
  };

  const deleteFile = async (fileId: string, filePath?: string | null) => {
    if (filePath) {
      await supabase.storage.from("contract-pdfs").remove([filePath]);
    }
    const { error } = await supabase.from("drive_files").delete().eq("id", fileId);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Excluído!");
    await fetchFiles();
  };

  const startSigning = async (fileId: string, contractId: string) => {
    await supabase
      .from("drive_files")
      .update({ status: "signing", contract_id: contractId } as any)
      .eq("id", fileId);
    await fetchFiles();
  };

  const moveItems = async (ids: string[], targetParentId: string | null) => {
    if (ids.length === 0) return;
    if (targetParentId && ids.includes(targetParentId)) {
      toast.error("Não é possível mover para dentro da própria pasta");
      return;
    }
    const { error } = await supabase
      .from("drive_files")
      .update({ parent_id: targetParentId } as any)
      .in("id", ids);
    if (error) {
      toast.error("Erro ao mover: " + error.message);
      return;
    }
    toast.success(`${ids.length} item(s) movido(s)`);
    await fetchFiles();
  };

  // Recursively copy items (folders + nested files). Files are duplicated in storage too.
  const copyItems = async (ids: string[], targetParentId: string | null) => {
    if (!companyId || ids.length === 0) return;
    const copyOne = async (id: string, newParent: string | null) => {
      const { data: src } = await supabase.from("drive_files").select("*").eq("id", id).maybeSingle();
      if (!src) return;
      const row: any = {
        servidor_id: companyId,
        parent_id: newParent,
        name: (src as any).type === "folder" ? `${(src as any).name}` : (src as any).name,
        type: (src as any).type,
        file_url: null,
        file_path: null,
        file_size: (src as any).file_size,
        file_type: (src as any).file_type,
        status: "normal",
        created_by_user_id: profile?.user_id,
        created_by_name: profile?.name,
      };
      if ((src as any).type === "file" && (src as any).file_path) {
        const ext = (src as any).file_path.split("/").pop();
        const newPath = `${companyId}/${Date.now()}_copy_${ext}`;
        const { error: copyErr } = await supabase.storage.from("contract-pdfs").copy((src as any).file_path, newPath);
        if (!copyErr) {
          row.file_path = newPath;
          const { data: signed } = await supabase.storage.from("contract-pdfs").createSignedUrl(newPath, 86400);
          row.file_url = signed?.signedUrl || null;
        }
      }
      const { data: inserted } = await supabase.from("drive_files").insert(row).select("id").single();
      if (inserted && (src as any).type === "folder") {
        const { data: children } = await supabase.from("drive_files").select("id").eq("parent_id", id);
        for (const c of (children as any[]) || []) await copyOne(c.id, (inserted as any).id);
      }
    };
    for (const id of ids) await copyOne(id, targetParentId);
    toast.success(`${ids.length} item(s) copiado(s)`);
    await fetchFiles();
  };

  const deleteMany = async (ids: string[]) => {
    if (ids.length === 0) return;
    // Recursively collect storage paths and ids
    const allIds: string[] = [];
    const allPaths: string[] = [];
    const walk = async (id: string) => {
      const { data: node } = await supabase.from("drive_files").select("*").eq("id", id).maybeSingle();
      if (!node) return;
      allIds.push(id);
      if ((node as any).file_path) allPaths.push((node as any).file_path);
      if ((node as any).type === "folder") {
        const { data: children } = await supabase.from("drive_files").select("id").eq("parent_id", id);
        for (const c of (children as any[]) || []) await walk(c.id);
      }
    };
    for (const id of ids) await walk(id);
    if (allPaths.length > 0) await supabase.storage.from("contract-pdfs").remove(allPaths);
    const { error } = await supabase.from("drive_files").delete().in("id", allIds);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success(`${ids.length} item(s) excluído(s)`);
    await fetchFiles();
  };

  // Fetch ALL folders in the tenant (for the move/copy picker)
  const fetchAllFolders = async (): Promise<DriveFile[]> => {
    if (!companyId) return [];
    const { data } = await supabase
      .from("drive_files")
      .select("*")
      .eq("servidor_id", companyId)
      .eq("type", "folder")
      .order("name", { ascending: true });
    return (data as DriveFile[]) || [];
  };

  return {
    files,
    loading,
    canManage,
    fetchFiles,
    createFolder,
    uploadFile,
    renameFile,
    deleteFile,
    startSigning,
    moveItems,
    copyItems,
    deleteMany,
    fetchAllFolders,
  };
}

