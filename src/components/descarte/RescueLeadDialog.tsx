import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  status: string;
}

interface RescueLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  onRescued: () => void;
}

export function RescueLeadDialog({ open, onOpenChange, lead, onRescued }: RescueLeadDialogProps) {
  const { isMaster, activeCompanyId, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Use lead's servidor_id as the tenant context; master sees all users of that servidor
  const companyId = lead?.servidor_id || activeCompanyId;

  useEffect(() => {
    if (!open || !companyId) return;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url, status")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      setUsers(data || []);
      setLoadingUsers(false);
    };
    fetchUsers();
  }, [open, companyId]);

  const selectedUser = users.find(u => u.user_id === selectedUserId) || null;

  const handleRescue = async () => {
    if (!selectedUserId) {
      toast.error("Selecione um usuário para encaminhar o lead.");
      return;
    }
    if (!note.trim()) {
      toast.error("Informe o motivo do resgate.");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("crm_leads")
        .update({
          lead_status: "open",
          stage: "novos",
          stage_entered_at: new Date().toISOString(),
          lost_reason: null,
          created_by_user_id: selectedUserId,
          created_by_name: selectedUser?.name || "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (updateError) throw updateError;

      await supabase.from("crm_lead_activities").insert({
        lead_id: lead.id,
        servidor_id: lead.servidor_id,
        title: "Lead resgatado do descarte",
        description: `Resgatado por ${profile?.name || "Admin"} e encaminhado para ${selectedUser?.name || "usuário"}. Motivo: ${note.trim()}`,
        type: "note",
        created_by_user_id: profile?.user_id || null,
        created_by_name: profile?.name || null,
      });

      toast.success("Lead resgatado e encaminhado com sucesso!");
      setSelectedUserId("");
      setNote("");
      onOpenChange(false);
      onRescued();
    } catch (err: any) {
      console.error("Error rescuing lead:", err);
      toast.error("Erro ao resgatar lead.");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Resgatar Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-muted-foreground">
              Empresa: <span className="font-medium text-foreground">{lead?.company_name}</span>
            </p>
            {lead?.lost_reason && (
              <p className="text-xs text-muted-foreground mt-1">
                Motivo da perda: <span className="text-destructive">{lead.lost_reason}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Encaminhar para *</Label>
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando usuários...
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione um usuário do servidor" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id} className="text-xs">
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected user info card */}
          {selectedUser && (
            <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedUser.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(selectedUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  {selectedUser.name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                  <Mail className="h-3 w-3" />
                  {selectedUser.email}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Motivo do resgate *</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Descreva o motivo do resgate deste lead..."
              className="text-xs min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleRescue} disabled={saving || !selectedUserId || !note.trim()}>
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
            Resgatar e Encaminhar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
