import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface DocumentRow {
  id: string;
  name: string;
  file_path: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  category: string;
  company_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  company_name?: string;
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*, companies(nome_fantasia, razao_social)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar documentos");
      console.error(error);
    } else {
      setDocuments(
        (data || []).map((d: any) => ({
          ...d,
          company_name: d.companies?.nome_fantasia || d.companies?.razao_social || "Sem empresa",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchDocuments();
  }, [user]);

  const uploadDocument = async (
    file: File,
    category: string,
    companyId: string | null
  ) => {
    const fileExt = file.name.split(".").pop();
    const filePath = `${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Erro ao fazer upload do arquivo");
      console.error(uploadError);
      return false;
    }

    const { data: signedData } = await supabase.storage
      .from("documents")
      .createSignedUrl(filePath, 3600);

    const { error: insertError } = await supabase.from("documents").insert({
      name: file.name,
      file_path: filePath,
      file_url: signedData?.signedUrl || "",
      file_size: file.size,
      file_type: file.type,
      category,
      company_id: companyId || null,
      uploaded_by: user?.id,
    });

    if (insertError) {
      toast.error("Erro ao registrar documento");
      console.error(insertError);
      return false;
    }

    toast.success("Documento enviado com sucesso!");
    await fetchDocuments();
    return true;
  };

  const deleteDocument = async (id: string, filePath: string) => {
    if (!profile?.is_master) {
      toast.error("Apenas o usuário master pode excluir documentos");
      return false;
    }
    await supabase.storage.from("documents").remove([filePath]);
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir documento");
      return false;
    }
    toast.success("Documento excluído!");
    await fetchDocuments();
    return true;
  };

  return { documents, loading, fetchDocuments, uploadDocument, deleteDocument };
}
