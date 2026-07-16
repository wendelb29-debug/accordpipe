import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import {
  ChatbotTeamWithRelations,
  useChatbotTeams,
  useTenantDepartments,
  useTenantUsers,
} from "@/hooks/useChatbotTeams";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: ChatbotTeamWithRelations | null;
}

const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "E-mail" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "web", label: "Web Chat" },
];

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const COLORS = ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#14B8A6"];

const STEPS = ["Básico", "Participantes", "Disponibilidade", "Regras", "Revisão"];

export function ChatbotTeamFormDialog({ open, onOpenChange, editing }: Props) {
  const { upsertTeam } = useChatbotTeams();
  const { data: users = [] } = useTenantUsers();
  const { data: departments = [] } = useTenantDepartments();
  const { teams } = useChatbotTeams();
  const [step, setStep] = useState(0);
  const [userSearch, setUserSearch] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [departmentId, setDepartmentId] = useState<string>("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [priority, setPriority] = useState(100);

  const [members, setMembers] = useState<{ user_id: string; role: "owner" | "supervisor" | "agent" }[]>([]);

  const [schedule, setSchedule] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({
    seg: { enabled: true, start: "08:00", end: "18:00" },
    ter: { enabled: true, start: "08:00", end: "18:00" },
    qua: { enabled: true, start: "08:00", end: "18:00" },
    qui: { enabled: true, start: "08:00", end: "18:00" },
    sex: { enabled: true, start: "08:00", end: "18:00" },
    sab: { enabled: false, start: "09:00", end: "13:00" },
    dom: { enabled: false, start: "09:00", end: "13:00" },
  });
  const [attendHolidays, setAttendHolidays] = useState(false);
  const [channels, setChannels] = useState<string[]>(["whatsapp"]);
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  const [maxWait, setMaxWait] = useState(300);
  const [offhoursMessage, setOffhoursMessage] = useState("");
  const [fallbackTeamId, setFallbackTeamId] = useState<string>("");

  const [aiDescription, setAiDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [transferMode, setTransferMode] = useState<"auto" | "confirm">("auto");
  const [messageBefore, setMessageBefore] = useState("");
  const [messageAfter, setMessageAfter] = useState("");
  const [unavailableAction, setUnavailableAction] = useState("stay_bot");

  useEffect(() => {
    if (editing && open) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setColor(editing.color);
      setDepartmentId(editing.department_id ?? "");
      setStatus(editing.status === "inactive" ? "inactive" : "active");
      setPriority(editing.priority);
      setMembers(editing.members.map((m) => ({ user_id: m.user_id, role: m.role })));
      if (editing.schedule && Object.keys(editing.schedule).length) {
        setSchedule({ ...schedule, ...editing.schedule } as any);
      }
      setAttendHolidays(editing.attend_holidays);
      setChannels(editing.channels ?? ["whatsapp"]);
      setMaxConcurrent(editing.max_concurrent_per_agent);
      setMaxWait(editing.max_wait_seconds);
      setOffhoursMessage(editing.offhours_message ?? "");
      setFallbackTeamId(editing.fallback_team_id ?? "");
      const r = editing.rules;
      if (r) {
        setAiDescription(r.ai_description ?? "");
        setKeywords(r.keywords ?? []);
        setTransferMode(r.transfer_mode);
        setMessageBefore(r.message_before ?? "");
        setMessageAfter(r.message_after ?? "");
        setUnavailableAction(r.unavailable_action ?? "stay_bot");
      }
    } else if (!editing && open) {
      // Reset
      setStep(0);
      setName("");
      setDescription("");
      setColor(COLORS[0]);
      setDepartmentId("");
      setStatus("active");
      setPriority(100);
      setMembers([]);
      setAttendHolidays(false);
      setChannels(["whatsapp"]);
      setMaxConcurrent(5);
      setMaxWait(300);
      setOffhoursMessage("");
      setFallbackTeamId("");
      setAiDescription("");
      setKeywords([]);
      setTransferMode("auto");
      setMessageBefore("");
      setMessageAfter("");
      setUnavailableAction("stay_bot");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u: any) =>
        (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const toggleMember = (uid: string) => {
    setMembers((prev) => {
      const found = prev.find((m) => m.user_id === uid);
      if (found) return prev.filter((m) => m.user_id !== uid);
      return [...prev, { user_id: uid, role: "agent" }];
    });
  };

  const setMemberRole = (uid: string, role: "owner" | "supervisor" | "agent") => {
    setMembers((prev) => prev.map((m) => (m.user_id === uid ? { ...m, role } : m)));
  };

  const addKeyword = () => {
    const v = keywordInput.trim();
    if (v && !keywords.includes(v)) setKeywords([...keywords, v]);
    setKeywordInput("");
  };

  const submit = async () => {
    if (!name.trim()) return;
    await upsertTeam.mutateAsync({
      id: editing?.id,
      team: {
        name: name.trim(),
        description: description || null,
        color,
        icon: "Users",
        department_id: departmentId || null,
        status,
        priority,
        schedule,
        channels,
        attend_holidays: attendHolidays,
        max_concurrent_per_agent: maxConcurrent,
        max_wait_seconds: maxWait,
        offhours_message: offhoursMessage || null,
        fallback_team_id: fallbackTeamId || null,
      },
      members,
      rules: {
        ai_description: aiDescription || null,
        keywords,
        allowed_channels: channels,
        transfer_mode: transferMode,
        message_before: messageBefore || null,
        message_after: messageAfter || null,
        unavailable_action: unavailableAction,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar equipe" : "Nova equipe do chatbot"}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 py-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                step === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1 pr-3">
          {step === 0 && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Nome da equipe *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Suporte técnico" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Equipe responsável por resolver..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cor</Label>
                  <div className="flex gap-2 mt-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={cn(
                          "h-8 w-8 rounded-full border-2",
                          color === c ? "border-foreground scale-110" : "border-transparent",
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Departamento</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prioridade</Label>
                  <Input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Menor número = maior prioridade</p>
                </div>
                <div className="flex items-end pb-2 gap-2">
                  <Switch
                    checked={status === "active"}
                    onCheckedChange={(v) => setStatus(v ? "active" : "inactive")}
                  />
                  <span className="text-sm">Equipe ativa</span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {members.length} participante(s) selecionado(s)
              </p>
              <div className="space-y-1">
                {filteredUsers.map((u: any) => {
                  const m = members.find((x) => x.user_id === u.id);
                  return (
                    <div
                      key={u.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg border transition-colors",
                        m ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                      )}
                    >
                      <Checkbox checked={!!m} onCheckedChange={() => toggleMember(u.id)} />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url ?? undefined} />
                        <AvatarFallback>{(u.full_name ?? u.email ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{u.full_name ?? "Sem nome"}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                      {m && (
                        <Select value={m.role} onValueChange={(v) => setMemberRole(u.id, v as any)}>
                          <SelectTrigger className="w-36 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Responsável</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="agent">Atendente</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum usuário encontrado no tenant.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 py-2">
              <Label className="text-sm">Horário de atendimento</Label>
              <div className="space-y-2">
                {Object.keys(schedule).map((k, i) => (
                  <div key={k} className="flex items-center gap-3 p-2 rounded-lg border">
                    <Switch
                      checked={schedule[k].enabled}
                      onCheckedChange={(v) =>
                        setSchedule({ ...schedule, [k]: { ...schedule[k], enabled: v } })
                      }
                    />
                    <span className="w-12 text-sm font-medium">{DAYS[i]}</span>
                    <Input
                      type="time"
                      className="w-32"
                      disabled={!schedule[k].enabled}
                      value={schedule[k].start}
                      onChange={(e) =>
                        setSchedule({ ...schedule, [k]: { ...schedule[k], start: e.target.value } })
                      }
                    />
                    <span className="text-muted-foreground">até</span>
                    <Input
                      type="time"
                      className="w-32"
                      disabled={!schedule[k].enabled}
                      value={schedule[k].end}
                      onChange={(e) =>
                        setSchedule({ ...schedule, [k]: { ...schedule[k], end: e.target.value } })
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={attendHolidays} onCheckedChange={setAttendHolidays} />
                <span className="text-sm">Atender em feriados</span>
              </div>
              <div>
                <Label>Canais permitidos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        setChannels((prev) =>
                          prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                        )
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs border",
                        channels.includes(c.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted border-border",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Máx. atendimentos simultâneos por atendente</Label>
                  <Input
                    type="number"
                    value={maxConcurrent}
                    onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Tempo máx. de espera (seg.)</Label>
                  <Input
                    type="number"
                    value={maxWait}
                    onChange={(e) => setMaxWait(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div>
                <Label>Mensagem fora do horário</Label>
                <Textarea
                  value={offhoursMessage}
                  onChange={(e) => setOffhoursMessage(e.target.value)}
                  placeholder="No momento estamos fora do horário..."
                />
              </div>
              <div>
                <Label>Equipe alternativa fora do horário</Label>
                <Select value={fallbackTeamId} onValueChange={setFallbackTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.filter((t) => t.id !== editing?.id).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Descrição para a IA</Label>
                <Textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="Use esta equipe quando o cliente pedir suporte técnico sobre..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Palavras-chave</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                    placeholder="Ex: suporte, ajuda, erro"
                  />
                  <Button type="button" onClick={addKeyword}>Adicionar</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((k) => (
                    <Badge key={k} variant="secondary" className="gap-1">
                      {k}
                      <button onClick={() => setKeywords(keywords.filter((x) => x !== k))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Modo de transferência</Label>
                <Select value={transferMode} onValueChange={(v: any) => setTransferMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automática</SelectItem>
                    <SelectItem value="confirm">Confirmar com o cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mensagem antes da transferência</Label>
                  <Textarea
                    value={messageBefore}
                    onChange={(e) => setMessageBefore(e.target.value)}
                    placeholder="Vou te transferir para..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Mensagem após a transferência</Label>
                  <Textarea
                    value={messageAfter}
                    onChange={(e) => setMessageAfter(e.target.value)}
                    placeholder="Olá, sou..."
                    rows={2}
                  />
                </div>
              </div>
              <div>
                <Label>Se ninguém estiver disponível</Label>
                <Select value={unavailableAction} onValueChange={setUnavailableAction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stay_bot">Permanecer com o chatbot</SelectItem>
                    <SelectItem value="send_unavailable">Enviar mensagem de indisponibilidade</SelectItem>
                    <SelectItem value="create_callback">Criar solicitação de retorno</SelectItem>
                    <SelectItem value="schedule_contact">Agendar contato</SelectItem>
                    <SelectItem value="transfer_other">Transferir para outra equipe</SelectItem>
                    <SelectItem value="close">Encerrar atendimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 py-2 text-sm">
              <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold text-base">{name || "(sem nome)"}</span>
                  <Badge variant={status === "active" ? "default" : "secondary"}>{status}</Badge>
                </div>
                {description && <p className="text-muted-foreground">{description}</p>}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div><span className="text-muted-foreground">Departamento:</span> {departments.find((d: any) => d.id === departmentId)?.name ?? "—"}</div>
                  <div><span className="text-muted-foreground">Prioridade:</span> {priority}</div>
                  <div><span className="text-muted-foreground">Participantes:</span> {members.length}</div>
                  <div><span className="text-muted-foreground">Canais:</span> {channels.join(", ")}</div>
                  <div><span className="text-muted-foreground">Máx. simultâneos:</span> {maxConcurrent}</div>
                  <div><span className="text-muted-foreground">Modo:</span> {transferMode === "auto" ? "Automático" : "Confirmar"}</div>
                </div>
                {keywords.length > 0 && (
                  <div className="pt-2">
                    <span className="text-muted-foreground">Palavras-chave:</span>{" "}
                    {keywords.map((k) => (
                      <Badge key={k} variant="outline" className="mr-1">{k}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="border-t pt-3 mt-2 flex flex-row gap-2 sm:justify-between">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={step === 0 && !name.trim()}
              >
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={upsertTeam.isPending || !name.trim()}>
                {upsertTeam.isPending ? "Salvando..." : "Salvar e ativar"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
