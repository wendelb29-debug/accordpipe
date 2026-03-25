import { useState, useEffect } from "react";
import { Search, Building2, Users, Mail, PhoneCall, X, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_STAGES } from "@/hooks/useCrmLeads";
import type { CrmLead } from "@/hooks/useCrmLeads";

interface CrmSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLead: (lead: CrmLead) => void;
}

export function CrmSearchDialog({ open, onOpenChange, onSelectLead }: CrmSearchDialogProps) {
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CrmLead[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const term = `%${query}%`;

      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .or(`company_name.ilike.${term},contact_name.ilike.${term},email.ilike.${term},phone.ilike.${term},source.ilike.${term}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setResults(data as CrmLead[]);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const getStageInfo = (stageId: string) => ALL_STAGES.find((s) => s.id === stageId);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-sm font-semibold">Pesquisar no CRM</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar por nome, e-mail, telefone, CPF, CNPJ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-10"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[400px] px-4 pb-4">
          {query.length < 2 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Digite pelo menos 2 caracteres para pesquisar
            </p>
          )}

          {searching && (
            <p className="text-xs text-muted-foreground text-center py-8">Buscando...</p>
          )}

          {!searching && query.length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nenhum resultado encontrado
            </p>
          )}

          <div className="space-y-1">
            {results.map((lead) => {
              const stage = getStageInfo(lead.stage);
              const isLost = lead.lead_status === "lost";

              return (
                <button
                  key={lead.id}
                  onClick={() => {
                    onSelectLead(lead);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "w-full text-left rounded-lg p-2.5 hover:bg-muted/80 transition-colors border",
                    isLost
                      ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
                      : "border-transparent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-semibold truncate">{lead.company_name}</span>
                      </div>
                      {lead.contact_name && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-[11px] text-muted-foreground truncate">{lead.contact_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-0.5">
                        {lead.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-[10px] text-muted-foreground truncate">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1">
                            <PhoneCall className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-[10px] text-muted-foreground">{lead.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {stage && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          {stage.title}
                        </Badge>
                      )}
                      {isLost && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0 gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> Perdido
                        </Badge>
                      )}
                      {lead.lead_status === "won" && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-green-500">✅ Ganho</Badge>
                      )}
                      <span className="text-[9px] text-muted-foreground">
                        {formatCurrency(lead.value_ps)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
