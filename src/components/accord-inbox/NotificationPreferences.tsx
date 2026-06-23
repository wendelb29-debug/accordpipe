import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "sonner";
import { Bell, Volume2, Music, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

const SOUND_OPTIONS = [
  { value: "notification_queue.mp3", label: "📞 Telefone" },
  { value: "bell.mp3", label: "🔔 Sino" },
  { value: "chime.mp3", label: "✨ Chime" },
  { value: "alert.mp3", label: "⚠️ Alerta" },
];

export function NotificationPreferences() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const companyId = useActiveCompanyId();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundFile, setSoundFile] = useState("notification_queue.mp3");
  const [volume, setVolume] = useState(80);
  const [browserEnabled, setBrowserEnabled] = useState(true);
  const [autoReleaseEnabled, setAutoReleaseEnabled] = useState(true);
  const [timeoutMin, setTimeoutMin] = useState(30);

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-prefs", user?.id, companyId],
    queryFn: async () => {
      if (!user?.id || !companyId) return null;
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .eq("tenant_id", companyId)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !!companyId,
  });

  useEffect(() => {
    if (prefs) {
      setSoundEnabled(!!prefs.sound_enabled);
      setSoundFile(prefs.sound_file || "notification_queue.mp3");
      setVolume(prefs.sound_volume ?? 80);
      setBrowserEnabled(!!prefs.browser_notification_enabled);
      setAutoReleaseEnabled(!!prefs.auto_release_enabled);
      setTimeoutMin(prefs.auto_release_timeout_minutes ?? 30);
    }
  }, [prefs]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user?.id || !companyId) throw new Error("Não autenticado");
      const payload = {
        user_id: user.id,
        tenant_id: companyId,
        sound_enabled: soundEnabled,
        sound_file: soundFile,
        sound_volume: volume,
        browser_notification_enabled: browserEnabled,
        auto_release_enabled: autoReleaseEnabled,
        auto_release_timeout_minutes: timeoutMin,
      };
      if (prefs?.id) {
        const { error } = await supabase
          .from("notification_preferences")
          .update(payload as any)
          .eq("id", prefs.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-prefs", user?.id, companyId] });
      toast.success("Preferências salvas!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const testSound = () => {
    try {
      const audio = new Audio(`/sounds/${soundFile}`);
      audio.volume = volume / 100;
      audio.play().catch((e) => toast.error("Não foi possível tocar: " + e.message));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Navegador não suporta notificações");
      return;
    }
    const r = await Notification.requestPermission();
    if (r === "granted") toast.success("Notificações ativadas no navegador");
    else toast.warning("Permissão não concedida");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 rounded-lg border bg-card">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Bell className="h-4 w-4" /> Notificações de Atendimento
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Volume2 className="h-4 w-4" /> Som de notificação
          </label>
          <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
        </div>

        {soundEnabled && (
          <>
            <Select value={soundFile} onValueChange={setSoundFile}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOUND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Volume</span>
                <span className="text-muted-foreground">{volume}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={(v) => setVolume(v[0])}
                min={0} max={100} step={10}
              />
            </div>

            <Button variant="secondary" size="sm" onClick={testSound} className="gap-2">
              <Music className="h-4 w-4" /> Testar som
            </Button>
          </>
        )}
      </div>

      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Notificação do navegador</label>
          <Switch checked={browserEnabled} onCheckedChange={setBrowserEnabled} />
        </div>
        {browserEnabled && (
          <Button variant="secondary" size="sm" onClick={requestBrowserPermission}>
            Solicitar permissão
          </Button>
        )}
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Auto-liberar atendimento</label>
          <Switch checked={autoReleaseEnabled} onCheckedChange={setAutoReleaseEnabled} />
        </div>
        {autoReleaseEnabled && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Liberar após (minutos)</label>
            <Input
              type="number"
              min={1}
              max={240}
              value={timeoutMin}
              onChange={(e) => setTimeoutMin(parseInt(e.target.value) || 30)}
            />
            <p className="text-[11px] text-muted-foreground">
              Se você não responder em {timeoutMin} min, o atendimento volta para a fila.
            </p>
          </div>
        )}
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar preferências
      </Button>
    </div>
  );
}
