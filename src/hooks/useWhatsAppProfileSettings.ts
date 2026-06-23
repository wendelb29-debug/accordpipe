import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Calls Uazapi profile endpoints to change WhatsApp display name / photo.
 * Loads the instance_token on demand via the SECURITY DEFINER RPC
 * `get_whatsapp_instance_token`, which already enforces admin/ceo/master role.
 *
 * Docs:
 *   POST {server}/profile/name   { name }
 *   POST {server}/profile/image  { image: base64 }
 */
export function useWhatsAppProfileSettings(
  integrationId: string | null | undefined,
  serverUrl: string | null | undefined,
) {
  const [loading, setLoading] = useState(false);
  const base = (serverUrl || "").replace(/\/$/, "");
  const ready = !!base && !!integrationId;

  const fetchToken = useCallback(async (): Promise<string | null> => {
    if (!integrationId) return null;
    const { data, error } = await supabase.rpc("get_whatsapp_instance_token" as any, {
      _integration_id: integrationId,
    });
    if (error || !data) {
      toast.error("Sem permissão para acessar o token desta instância");
      return null;
    }
    return String(data);
  }, [integrationId]);

  const updateName = async (name: string): Promise<boolean> => {
    if (!ready) {
      toast.error("Instância WhatsApp não configurada");
      return false;
    }
    if (!name.trim()) {
      toast.error("Informe um nome");
      return false;
    }
    setLoading(true);
    try {
      const token = await fetchToken();
      if (!token) return false;
      const r = await fetch(`${base}/profile/name`, {
        method: "POST",
        headers: { token, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t.slice(0, 140) || `HTTP ${r.status}`);
      }
      toast.success(`Nome do WhatsApp alterado para "${name.trim()}"`);
      return true;
    } catch (e: any) {
      toast.error(`Erro ao alterar nome: ${e.message || e}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateImage = async (file: File): Promise<boolean> => {
    if (!ready) {
      toast.error("Instância WhatsApp não configurada");
      return false;
    }
    setLoading(true);
    try {
      const token = await fetchToken();
      if (!token) return false;
      const b64 = await fileToBase64(file);
      const r = await fetch(`${base}/profile/image`, {
        method: "POST",
        headers: { token, "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64 }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t.slice(0, 140) || `HTTP ${r.status}`);
      }
      toast.success("Foto do WhatsApp atualizada");
      return true;
    } catch (e: any) {
      toast.error(`Erro ao alterar foto: ${e.message || e}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, ready, updateName, updateImage };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      // Strip the "data:*/*;base64," prefix so Uazapi gets pure base64
      const idx = result.indexOf("base64,");
      resolve(idx >= 0 ? result.slice(idx + 7) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
