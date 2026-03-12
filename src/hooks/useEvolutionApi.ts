import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useEvolutionApi() {
  const [loading, setLoading] = useState(false);

  const invoke = async (action: string, params: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: { action, ...params },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    } catch (err: any) {
      console.error("Evolution API error:", err);
      toast.error(err.message || "Erro ao conectar com a Evolution API");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createInstance = (instanceName: string) =>
    invoke("create_instance", { instance_name: instanceName });

  const connect = (instanceName: string) =>
    invoke("connect", { instance_name: instanceName });

  const connectionState = (instanceName: string) =>
    invoke("connection_state", { instance_name: instanceName });

  const sendText = (instanceName: string, number: string, text: string) =>
    invoke("send_text", { instance_name: instanceName, number, text });

  const sendImage = (instanceName: string, number: string, mediaUrl: string, caption?: string) =>
    invoke("send_image", { instance_name: instanceName, number, media_url: mediaUrl, caption });

  const sendAudio = (instanceName: string, number: string, mediaUrl: string) =>
    invoke("send_audio", { instance_name: instanceName, number, media_url: mediaUrl });

  const logout = (instanceName: string) =>
    invoke("logout", { instance_name: instanceName });

  return {
    loading,
    createInstance,
    connect,
    connectionState,
    sendText,
    sendImage,
    sendAudio,
    logout,
  };
}
