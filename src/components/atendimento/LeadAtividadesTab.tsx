import { useState, useEffect } from "react";
import {
  Calendar, Clock, Edit, Trash2, Copy, Ban, Plus, Loader2, Send,
  PhoneCall, Mail, Users, Briefcase, MessageSquare, CheckCircle2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CrmLead } from "@/hooks/useCrmLeads";
import { toast } from "sonner";

const ACTIVITY_TYPES = [
  { value: "internal", label: "Atividade Interna", icon: Briefcase },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "call", label: "Ligação", icon: PhoneCall },
  { value: "meeting", label: "Reunião", icon: Users },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
];

const REMINDER_OPTIONS = [
  { value: "none", label: "Sem lembrete" },
  { value: "5", label: "5 minutos antes" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "240", label: "4 horas antes" },
  { value: "1440", label: "1 dia antes" },
];

interface ActivityItem {
  id: string;
  lead_id: string;
  servidor_id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: any;
  created_by_user_id: string | null;
  created_by_name: string | null;
  created_at: string;
}

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    "\n" + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

export function LeadAtividadesTab({
  lead,
  addActivity,
}: {
  lead: CrmLead;
  addActivity: (data: any) => Promise<any>;
}) {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subTab, setSubTab] = useState("planejadas");
  const [completionTarget, setCompletionTarget] = useState<ActivityItem | null>(null);
  const [completionComment, setCompletionComment] = useState("");

  const [form, setForm] = useState({
    type: "meeting",
    title: "",
    description: "",
    status: "planejada" as "planejada" | "concluida",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    duration: "00:30",
    reminder: "none",
  });

  useEffect(() => {
    fetchActivities();
  }, [lead.id]);

  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_lead_activities")
      .select("*")
      .eq("lead_id", lead.id)
      .in("type", ["activity", "meeting", "call", "email", "internal", "whatsapp"])
      .order("created_at", { ascending: false });
    if (!error) {
      // Filter out system log entries (completion/deletion/reopen logs) — only keep real scheduled activities
      const real = ((data as ActivityItem[]) || []).filter(a => {
        const meta = a.metadata || {};
        // Real activities have scheduled_at in metadata; system logs don't
        return meta.scheduled_at || meta.activity_status;
      });
      setActivities(real);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      type: "meeting",
      title: "",
      description: "",
      status: "planejada",
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      duration: "00:30",
      reminder: "none",
    });
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("Informe o título da atividade");
      return;
    }
    setSaving(true);
    try {
      const scheduledAt = `${form.date}T${form.time}:00`;
      const result = await addActivity({
        type: form.type === "internal" ? "activity" : form.type,
        title: form.title,
        description: form.description || undefined,
        servidor_id: lead.servidor_id,
        metadata: {
          activity_status: form.status,
          scheduled_at: scheduledAt,
          duration: form.duration,
          reminder: form.reminder,
          activity_type_label: ACTIVITY_TYPES.find(t => t.value === form.type)?.label || form.type,
        },
      });

      if (!result) {
        toast.error("Erro ao criar atividade. Verifique suas permissões.");
        return;
      }

      // Schedule reminder notification
      if (form.reminder !== "none" && form.status === "planejada" && profile?.user_id) {
        const reminderMinutes = parseInt(form.reminder);
        const scheduledDate = new Date(scheduledAt);
        const reminderDate = new Date(scheduledDate.getTime() - reminderMinutes * 60 * 1000);
        const now = new Date();

        if (reminderDate > now) {
          // Create notification with reminder metadata
          await supabase.rpc("create_notification", {
            _user_id: profile.user_id,
            _title: `Lembrete: ${form.title}`,
            _message: `Atividade "${form.title}" agendada para ${new Date(scheduledAt).toLocaleString("pt-BR")} com ${lead.company_name}.`,
            _type: "reminder",
            _metadata: {
              lead_id: lead.id,
              scheduled_at: scheduledAt,
              reminder_at: reminderDate.toISOString(),
              activity_type: form.type,
            },
          });
        }
      }

      toast.success("Atividade criada!");
      resetForm();
      setShowForm(false);
      await fetchActivities();
    } catch (err) {
      console.error("Error creating activity:", err);
      toast.error("Erro ao criar atividade");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (activity: ActivityItem, newStatus: string, comment?: string) => {
    // If trying to complete, show dialog first
    if (newStatus === "concluida" && !comment) {
      setCompletionTarget(activity);
      setCompletionComment("");
      return;
    }

    const meta = activity.metadata || {};
    const updatedMeta: any = { ...meta, activity_status: newStatus };
    if (comment) {
      updatedMeta.completion_comment = comment;
      updatedMeta.completed_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from("crm_lead_activities")
      .update({ metadata: updatedMeta } as any)
      .eq("id", activity.id);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    await addActivity({
      type: newStatus === "concluida" ? "activity_completed" : "activity_reopened",
      title: `Atividade ${newStatus === "concluida" ? "concluída" : "reaberta"}: ${activity.title}`,
      description: newStatus === "concluida"
        ? `Status alterado para "Concluída".\n\n**Comentário:** ${comment}`
        : `Status alterado para "Planejada".`,
      servidor_id: lead.servidor_id,
    });
    toast.success(newStatus === "concluida" ? "Atividade concluída!" : "Atividade reaberta");
    await fetchActivities();
  };

  const handleConfirmCompletion = async () => {
    if (!completionComment.trim()) {
      toast.error("Comentário obrigatório para concluir a atividade");
      return;
    }
    if (!completionTarget) return;
    await handleToggleStatus(completionTarget, "concluida", completionComment.trim());
    setCompletionTarget(null);
    setCompletionComment("");
  };

  const handleDelete = async (activity: ActivityItem) => {
    const { error } = await supabase.from("crm_lead_activities").delete().eq("id", activity.id);
    if (error) {
      toast.error("Erro ao excluir atividade");
      return;
    }
    await addActivity({
      type: "activity",
      title: `Atividade excluída: ${activity.title}`,
      servidor_id: lead.servidor_id,
    });
    toast.success("Atividade excluída!");
    await fetchActivities();
  };

  const handleDuplicate = async (activity: ActivityItem) => {
    const meta = activity.metadata || {};
    await addActivity({
      type: activity.type,
      title: `${activity.title} (cópia)`,
      description: activity.description || undefined,
      servidor_id: lead.servidor_id,
      metadata: { ...meta, activity_status: "planejada" },
    });
    toast.success("Atividade duplicada!");
    await fetchActivities();
  };

  // Filter activities by status
  const getStatus = (a: ActivityItem) => a.metadata?.activity_status || "planejada";
  const planejadas = activities.filter(a => getStatus(a) === "planejada");
  const concluidas = activities.filter(a => getStatus(a) === "concluida");
  const noshow = activities.filter(a => getStatus(a) === "no_show");

  const getTypeIcon = (type: string) => {
    const found = ACTIVITY_TYPES.find(t => t.value === type);
    return found?.icon || Briefcase;
  };

  const renderTable = (items: ActivityItem[], showCheckbox: boolean) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma atividade nesta categoria</p>
        </div>
      );
    }

    return (
      <div className="rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              {showCheckbox && <th className="w-10 p-2.5"></th>}
              <th className="text-left p-2.5 font-medium text-muted-foreground">Data Início</th>
              <th className="text-left p-2.5 font-medium text-muted-foreground">Duração</th>
              <th className="text-left p-2.5 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left p-2.5 font-medium text-muted-foreground">Título</th>
              <th className="text-left p-2.5 font-medium text-muted-foreground">Resp.</th>
              <th className="text-right p-2.5 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const meta = a.metadata || {};
              const TypeIcon = getTypeIcon(a.type);
              const typeLabel = meta.activity_type_label || ACTIVITY_TYPES.find(t => t.value === a.type)?.label || a.type;
              const scheduledAt = meta.scheduled_at ? new Date(meta.scheduled_at) : new Date(a.created_at);
              const isPast = scheduledAt < new Date() && getStatus(a) === "planejada";

              return (
                <tr key={a.id} className={cn("border-b last:border-0 hover:bg-muted/30", isPast && "bg-destructive/5")}>
                  {showCheckbox && (
                    <td className="p-2.5 text-center">
                      <Checkbox
                        checked={getStatus(a) === "concluida"}
                        onCheckedChange={(checked) =>
                          handleToggleStatus(a, checked ? "concluida" : "planejada")
                        }
                      />
                    </td>
                  )}
                  <td className="p-2.5 text-muted-foreground whitespace-pre-line">
                    {scheduledAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    {"\n"}
                    <span className="text-foreground font-medium">
                      {scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td className="p-2.5 text-muted-foreground">{meta.duration || "00:30"}</td>
                  <td className="p-2.5">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <TypeIcon className="h-3.5 w-3.5 text-primary" />
                      {typeLabel}
                    </span>
                  </td>
                  <td className="p-2.5 font-medium text-foreground">{a.title}</td>
                  <td className="p-2.5 text-muted-foreground">{a.created_by_name || "Sistema"}</td>
                  <td className="p-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar"
                        onClick={() => {
                          const m = a.metadata || {};
                          const sd = m.scheduled_at ? new Date(m.scheduled_at) : new Date(a.created_at);
                          setForm({
                            type: a.type === "activity" ? "internal" : a.type,
                            title: a.title,
                            description: a.description || "",
                            status: getStatus(a) as any,
                            date: sd.toISOString().slice(0, 10),
                            time: sd.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                            duration: m.duration || "00:30",
                            reminder: m.reminder || "none",
                          });
                          // Delete old and recreate
                          handleDelete(a).then(() => setShowForm(true));
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      {getStatus(a) === "planejada" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="No-show"
                          onClick={() => handleToggleStatus(a, "no_show")}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar"
                        onClick={() => handleDuplicate(a)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Excluir"
                        onClick={() => handleDelete(a)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Atividades
        </h3>
        <Button
          size="sm"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-3.5 w-3.5" /> Criar atividade
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h4 className="text-sm font-semibold">Criar atividade</h4>

            <div className="grid grid-cols-3 gap-3">
              {/* Tipo */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-primary">Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-1.5">
                          <t.icon className="h-3.5 w-3.5" /> {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lembrete */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-primary">Lembrete</Label>
                <Select value={form.reminder} onValueChange={(v) => setForm({ ...form, reminder: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REMINDER_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-primary">Status</Label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={form.status === "planejada" ? "default" : "outline"}
                    className={cn("text-xs flex-1 h-8", form.status === "planejada" && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                    onClick={() => setForm({ ...form, status: "planejada" })}
                  >
                    Planejada
                  </Button>
                  <Button
                    size="sm"
                    variant={form.status === "concluida" ? "default" : "outline"}
                    className={cn("text-xs flex-1 h-8", form.status === "concluida" && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                    onClick={() => setForm({ ...form, status: "concluida" })}
                  >
                    Concluída
                  </Button>
                </div>
              </div>
            </div>

            {/* Título */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-primary">Título</Label>
              <Input
                className="h-8 text-xs"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Reunião de apresentação"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-primary">Descrição</Label>
              <Textarea
                className="text-xs min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes da atividade..."
              />
            </div>

            {/* Data, Hora, Duração */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Data
                </Label>
                <Input
                  className="h-8 text-xs"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Hora
                </Label>
                <Input
                  className="h-8 text-xs"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Duração
                </Label>
                <Input
                  className="h-8 text-xs"
                  type="time"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
              </div>
            </div>

            {/* Responsável */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-primary">Responsável</Label>
              <Input
                className="h-8 text-xs bg-muted"
                value={profile?.name || ""}
                readOnly
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="text-xs">
                Fechar
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!form.title.trim() || saving}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="planejadas" className="text-xs gap-1.5">
            Planejadas <Badge variant="secondary" className="text-[10px] ml-1 h-4 px-1">{planejadas.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="concluidas" className="text-xs gap-1.5">
            Concluídas <Badge variant="secondary" className="text-[10px] ml-1 h-4 px-1">{concluidas.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="noshow" className="text-xs">
            No-show
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="planejadas" className="mt-3">
              {renderTable(planejadas, true)}
            </TabsContent>
            <TabsContent value="concluidas" className="mt-3">
              {renderTable(concluidas, false)}
            </TabsContent>
            <TabsContent value="noshow" className="mt-3">
              {renderTable(noshow, false)}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Completion comment dialog */}
      {completionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-xl font-bold text-center text-foreground">
              Faça seu comentário abaixo:
            </h3>
            <Textarea
              className="min-h-[160px] text-sm"
              placeholder="Descreva o resultado da atividade..."
              value={completionComment}
              onChange={(e) => setCompletionComment(e.target.value)}
              autoFocus
            />
            <div className="flex justify-center gap-3">
              <Button
                variant="destructive"
                className="gap-1.5 px-6"
                onClick={() => { setCompletionTarget(null); setCompletionComment(""); }}
              >
                <X className="h-4 w-4" /> Cancelar
              </Button>
              <Button
                className="gap-1.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmCompletion}
                disabled={!completionComment.trim()}
              >
                <CheckCircle2 className="h-4 w-4" /> Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
