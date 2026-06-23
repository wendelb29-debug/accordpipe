import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Eye, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Props {
  companyId: string;
  isAdmin: boolean;
}

export function DepartmentRoutingConfig({ companyId, isAdmin }: Props) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [response, setResponse] = useState("");
  const [preview, setPreview] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["dept-routing-config", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_routing_config")
        .select("*")
        .eq("tenant_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (config) {
      setEnabled(!!config.is_enabled);
      setWelcome(config.welcome_message || "");
      setResponse(config.first_response_message || "");
    }
  }, [config]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        tenant_id: companyId,
        is_enabled: enabled,
        welcome_message: welcome,
        first_response_message: response,
      };
      if (config?.id) {
        const { error } = await supabase
          .from("department_routing_config")
          .update(payload as any)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("department_routing_config")
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dept-routing-config", companyId] });
      toast.success("Configuração salva!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  if (!isAdmin) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-sm">Roteamento por Departamento</h3>
            <p className="text-xs text-muted-foreground">
              Mostra menu numerado ao novo contato e roteia automaticamente.
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Mensagem de Boas-vindas</label>
            <Textarea
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
              rows={7}
              placeholder="Mensagem mostrada ao primeiro contato"
            />
            <p className="text-[10px] text-muted-foreground">
              Liste as opções como "1 - Vendas", "2 - Suporte"… (mesma ordem dos departamentos).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              Mensagem após escolha do departamento
            </label>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              placeholder="Use {department} para inserir o nome do departamento"
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPreview(!preview)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" /> {preview ? "Esconder" : "Ver"} Preview
          </Button>

          {preview && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm whitespace-pre-wrap">
              {welcome || "(mensagem vazia)"}
            </div>
          )}
        </>
      )}

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar
      </Button>
    </div>
  );
}
