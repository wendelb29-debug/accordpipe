import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  X, Copy, RefreshCw, Loader2, Users, Camera, Trash2, Check, ShieldCheck,
  UserPlus, UserMinus, Crown, ShieldOff, Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GroupChat {
  id: string;
  wa_chatid: string;
  name: string | null;
  image_url: string | null;
  group_topic: string | null;
  participant_count: number;
  group_is_announce: boolean;
  group_join_approval_required: boolean;
  group_member_add_mode: "admin_add" | "all_member_add";
  group_invite_link: string | null;
  instance_is_admin: boolean;
}
interface Participant {
  id: string;
  participant_jid: string;
  participant_name: string | null;
  is_admin: boolean;
}
interface Pending { jid: string; name: string | null }

interface Props {
  tenantId: string;
  chat: GroupChat;
  onClose: () => void;
  onUpdated: () => void; // parent refetch groups list
}

// Resize any image File → 640x640 JPEG base64 (center-cropped).
async function fileToJpegBase64(file: File, size = 640): Promise<string> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("invalid image")); img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas not supported");
    const s = Math.min(img.width, img.height);
    const sx = (img.width - s) / 2;
    const sy = (img.height - s) / 2;
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    return dataUrl.replace(/^data:[^;]+;base64,/, "");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function GroupInfoPanel({ tenantId, chat, onClose, onUpdated }: Props) {
  const [info, setInfo] = useState<GroupChat>(chat);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(chat.name ?? "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(chat.group_topic ?? "");
  const [addParticipant, setAddParticipant] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = info.instance_is_admin;

  const refresh = async (force = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("uazapi-group-info", {
        body: { tenant_id: tenantId, groupjid: info.wa_chatid, force },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPending(((data as any)?.pending_approvals ?? []) as Pending[]);
      // Reload chat + participants from DB (single source of truth)
      const [{ data: chatRow }, { data: parts }] = await Promise.all([
        supabase.from("whatsapp_chats").select("*").eq("id", info.id).maybeSingle(),
        supabase.from("whatsapp_group_participants").select("*")
          .eq("chat_id", info.id).order("is_admin", { ascending: false }),
      ]);
      if (chatRow) {
        setInfo(chatRow as GroupChat);
        setNameDraft((chatRow as any).name ?? "");
        setDescDraft((chatRow as any).group_topic ?? "");
      }
      setParticipants((parts as Participant[]) ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao carregar informações do grupo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [info.id]);

  const call = async (fn: string, body: any, successMsg: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { tenant_id: tenantId, groupjid: info.wa_chatid, ...body },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(successMsg);
      await refresh(true);
      onUpdated();
      return data;
    } catch (e: any) {
      toast.error(e?.message || "Falha na operação");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    const n = nameDraft.trim();
    if (!n) return toast.error("Nome não pode ser vazio");
    if (n.length > 25) return toast.error("Máximo 25 caracteres");
    await call("uazapi-group-update-name", { name: n }, "Nome atualizado");
    setEditingName(false);
  };

  const saveDesc = async () => {
    if (descDraft.length > 512) return toast.error("Máximo 512 caracteres");
    await call("uazapi-group-update-description", { description: descDraft }, "Descrição atualizada");
    setEditingDesc(false);
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setBusy(true);
      const image_base64 = await fileToJpegBase64(file, 640);
      await call("uazapi-group-update-image", { image_base64 }, "Foto do grupo atualizada");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao processar a imagem");
      setBusy(false);
    }
  };

  const removeImage = async () => {
    await call("uazapi-group-update-image", { remove: true }, "Foto removida");
  };

  const toggleAnnounce = async (v: boolean) => {
    await call("uazapi-group-update-announce", { announce: v },
      v ? "Só admins podem enviar" : "Todos podem enviar");
  };
  const toggleJoinApproval = async (v: boolean) => {
    await call("uazapi-group-update-join-approval", { IsJoinApprovalRequired: v },
      v ? "Aprovação de entrada ativada" : "Aprovação de entrada desativada");
  };
  const setMemberAddMode = async (mode: "admin_add" | "all_member_add") => {
    await call("uazapi-group-update-member-add-mode", { MemberAddMode: mode },
      mode === "admin_add" ? "Só admins adicionam membros" : "Todos podem adicionar");
  };
  const resetInvite = async () => {
    await call("uazapi-group-reset-invite", {}, "Novo link de convite gerado");
  };
  const copyInvite = () => {
    if (!info.group_invite_link) return;
    navigator.clipboard.writeText(info.group_invite_link);
    toast.success("Link copiado");
  };

  const doParticipant = async (
    action: "add" | "remove" | "promote" | "demote" | "approve" | "reject",
    participantsList: string[],
    msg: string,
  ) => call("uazapi-group-update-participants", { action, participants: participantsList }, msg);

  const handleAdd = async () => {
    const digits = addParticipant.replace(/\D+/g, "");
    if (digits.length < 10) return toast.error("Número inválido (use formato internacional com DDI)");
    await doParticipant("add", [digits], "Participante adicionado");
    setAddParticipant("");
  };

  return (
    <div className="absolute inset-0 z-30 flex bg-background/95 backdrop-blur-sm">
      <div className="ml-auto w-full max-w-md h-full bg-background border-l border-border/60 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 border-b border-border/60 bg-background">
          <Button size="icon" variant="ghost" onClick={onClose}><X size={16} /></Button>
          <div className="text-sm font-semibold">Informações do grupo</div>
          {loading && <Loader2 size={14} className="animate-spin ml-auto text-muted-foreground" />}
          {!loading && (
            <Button size="icon" variant="ghost" className="ml-auto" onClick={() => refresh(true)} title="Atualizar">
              <RefreshCw size={14} />
            </Button>
          )}
        </div>

        <div className="p-4 space-y-6">
          {/* Photo + name */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {info.image_url
                  ? <img src={info.image_url} alt="" className="h-full w-full object-cover" />
                  : <Users size={36} className="text-primary" />}
              </div>
              {isAdmin && (
                <>
                  <Button
                    size="icon" variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    title="Trocar foto"
                  >
                    <Camera size={14} />
                  </Button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFilePicked} />
                </>
              )}
            </div>
            {isAdmin && info.image_url && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={removeImage} disabled={busy}>
                <Trash2 size={12} className="mr-1" /> Remover foto
              </Button>
            )}

            {!editingName ? (
              <div className="flex items-center gap-2">
                <div className="text-lg font-semibold">{info.name || info.wa_chatid}</div>
                {isAdmin && (
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(true)}>Editar</Button>
                )}
              </div>
            ) : (
              <div className="w-full flex items-center gap-2">
                <input
                  autoFocus value={nameDraft} maxLength={25}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm rounded-md bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button size="sm" onClick={saveName} disabled={busy}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setNameDraft(info.name ?? ""); }}>Cancelar</Button>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {info.participant_count} participantes
              {isAdmin && <span className="ml-2 inline-flex items-center gap-1 text-primary"><ShieldCheck size={12}/>Você é admin</span>}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</div>
              {isAdmin && !editingDesc && (
                <Button size="sm" variant="ghost" onClick={() => setEditingDesc(true)}>Editar</Button>
              )}
            </div>
            {!editingDesc ? (
              <p className="text-sm whitespace-pre-wrap text-foreground/90">
                {info.group_topic || <span className="text-muted-foreground italic">Sem descrição</span>}
              </p>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={descDraft} maxLength={512} rows={4}
                  onChange={(e) => setDescDraft(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setEditingDesc(false); setDescDraft(info.group_topic ?? ""); }}>Cancelar</Button>
                  <Button size="sm" onClick={saveDesc} disabled={busy}>Salvar</Button>
                </div>
                <div className="text-[10px] text-muted-foreground text-right">{descDraft.length}/512</div>
              </div>
            )}
          </div>

          {/* Invite link */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Link de convite</div>
            {info.group_invite_link ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3 py-2 text-xs bg-muted/40 rounded-md truncate font-mono">
                  {info.group_invite_link}
                </div>
                <Button size="icon" variant="ghost" onClick={copyInvite} title="Copiar"><Copy size={14} /></Button>
                {isAdmin && (
                  <Button size="icon" variant="ghost" onClick={resetInvite} disabled={busy} title="Gerar novo link (o antigo vai parar de funcionar)">
                    <RefreshCw size={14} />
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <LinkIcon size={12} /> Link ainda não disponível.
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={resetInvite} disabled={busy}>Gerar link</Button>
                )}
              </div>
            )}
          </div>

          {/* Admin toggles */}
          {isAdmin && (
            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configurações do grupo</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Só admins podem enviar</div>
                  <div className="text-xs text-muted-foreground">Silencia membros comuns</div>
                </div>
                <Switch checked={info.group_is_announce} disabled={busy} onCheckedChange={toggleAnnounce} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Aprovar novas entradas</div>
                  <div className="text-xs text-muted-foreground">Novos participantes precisam ser aprovados</div>
                </div>
                <Switch checked={info.group_join_approval_required} disabled={busy} onCheckedChange={toggleJoinApproval} />
              </div>
              <div>
                <div className="text-sm font-medium mb-1.5">Quem pode adicionar membros</div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={info.group_member_add_mode === "admin_add" ? "default" : "outline"}
                    disabled={busy}
                    onClick={() => setMemberAddMode("admin_add")}
                  >Só admins</Button>
                  <Button
                    size="sm"
                    variant={info.group_member_add_mode === "all_member_add" ? "default" : "outline"}
                    disabled={busy}
                    onClick={() => setMemberAddMode("all_member_add")}
                  >Todos</Button>
                </div>
              </div>
            </div>
          )}

          {/* Pending approvals */}
          {isAdmin && pending.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Solicitações pendentes ({pending.length})
              </div>
              {pending.map((p) => (
                <div key={p.jid} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{p.name || p.jid.split("@")[0]}</span>
                  <Button size="sm" variant="outline" disabled={busy}
                    onClick={() => doParticipant("approve", [p.jid], "Solicitação aprovada")}
                  ><Check size={12} className="mr-1"/>Aprovar</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={busy}
                    onClick={() => doParticipant("reject", [p.jid], "Solicitação rejeitada")}
                  ><X size={12} className="mr-1"/>Rejeitar</Button>
                </div>
              ))}
            </div>
          )}

          {/* Participants */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Participantes ({participants.length})
            </div>
            {isAdmin && (
              <div className="flex gap-2 mb-3">
                <input
                  value={addParticipant}
                  onChange={(e) => setAddParticipant(e.target.value)}
                  placeholder="Ex: 5511999999999"
                  className="flex-1 px-3 py-2 text-sm rounded-md bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <Button size="sm" onClick={handleAdd} disabled={busy || !addParticipant}>
                  <UserPlus size={14} className="mr-1"/> Adicionar
                </Button>
              </div>
            )}
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {participants.map((p) => (
                <div key={p.id} className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40",
                )}>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users size={13} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">
                      {p.participant_name || p.participant_jid.split("@")[0]}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.participant_jid.split("@")[0]}</div>
                  </div>
                  {p.is_admin && (
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Admin</span>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-0.5">
                      {p.is_admin ? (
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={busy}
                          onClick={() => doParticipant("demote", [p.participant_jid], "Admin removido")}
                          title="Rebaixar"
                        ><ShieldOff size={13}/></Button>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={busy}
                          onClick={() => doParticipant("promote", [p.participant_jid], "Promovido a admin")}
                          title="Promover a admin"
                        ><Crown size={13}/></Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" disabled={busy}
                        onClick={() => doParticipant("remove", [p.participant_jid], "Participante removido")}
                        title="Remover do grupo"
                      ><UserMinus size={13}/></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
