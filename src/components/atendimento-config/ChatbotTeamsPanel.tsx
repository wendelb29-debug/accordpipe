import { useMemo, useState } from "react";
import { Plus, Search, Edit3, Copy, Trash2, Power, Users, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useChatbotTeams, ChatbotTeamWithRelations } from "@/hooks/useChatbotTeams";
import { ChatbotTeamFormDialog } from "./ChatbotTeamFormDialog";
import { cn } from "@/lib/utils";

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  instagram: "Instagram",
  facebook: "Facebook",
  web: "Web",
};

export function ChatbotTeamsPanel() {
  const { teams, isLoading, toggleStatus, duplicateTeam, deleteTeam } = useChatbotTeams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"priority" | "name" | "members" | "updated_at">("priority");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChatbotTeamWithRelations | null>(null);

  const filtered = useMemo(() => {
    let arr = [...teams];
    if (statusFilter !== "all") arr = arr.filter((t) => t.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((t) => t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q));
    arr.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "members") return b.members.length - a.members.length;
      if (sortBy === "updated_at")
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return a.priority - b.priority;
    });
    return arr;
  }, [teams, search, statusFilter, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Equipes de atendimento</h3>
          <p className="text-xs text-muted-foreground">
            Equipes para as quais o chatbot poderá transferir uma conversa.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar equipe
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar equipe" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-44"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Prioridade</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="members">Membros</SelectItem>
            <SelectItem value="updated_at">Atualizadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Carregando equipes...</p>}
      {!isLoading && filtered.length === 0 && (
        <Card className="p-10 text-center border-dashed">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nenhuma equipe cadastrada</p>
          <p className="text-sm text-muted-foreground mb-4">
            Crie uma equipe para que o chatbot possa transferir atendimentos.
          </p>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Criar primeira equipe
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((t) => (
          <Card key={t.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0"
                style={{ backgroundColor: t.color }}
              >
                {t.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold truncate">{t.name}</h4>
                  <Badge
                    variant={t.status === "active" ? "default" : "secondary"}
                    className={cn("text-[10px]", t.status === "active" && "bg-emerald-500")}
                  >
                    {t.status === "active" ? "Ativa" : t.status === "inactive" ? "Inativa" : "Rascunho"}
                  </Badge>
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Membros:</span> {t.members.length}</div>
              <div><span className="text-muted-foreground">Prioridade:</span> {t.priority}</div>
              <div><span className="text-muted-foreground">Máx./agente:</span> {t.max_concurrent_per_agent}</div>
              <div className="truncate">
                <span className="text-muted-foreground">Canais:</span>{" "}
                {t.channels.map((c) => CHANNEL_LABEL[c] ?? c).join(", ")}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1"
                onClick={() =>
                  toggleStatus.mutate({ id: t.id, status: t.status === "active" ? "inactive" : "active" })
                }
              >
                <Power className="h-3.5 w-3.5" />
                {t.status === "active" ? "Desativar" : "Ativar"}
              </Button>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(t); setDialogOpen(true); }}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateTeam.mutate(t)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
                      <AlertDialogDescription>
                        A equipe "{t.name}" será removida junto com seus membros e regras. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteTeam.mutate(t.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ChatbotTeamFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
}
