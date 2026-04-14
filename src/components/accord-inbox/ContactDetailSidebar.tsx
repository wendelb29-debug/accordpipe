import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InboxContact } from "@/hooks/useWhatsAppInbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Phone, Mail, Building2, MapPin, Tag, ExternalLink,
  KanbanSquare, Plus, X, User, Calendar, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface ContactDetailSidebarProps {
  contact: InboxContact;
  onClose: () => void;
  onCreateDemand: () => void;
  companyId: string | null | undefined;
}

interface LeadInfo {
  id: string;
  company_name: string;
  stage: string;
  value_mrr: number;
  contact_name: string | null;
  created_at: string;
}

interface RegistrationInfo {
  id: string;
  nome_completo: string | null;
  plano_contratado: string | null;
  client_status: string;
}

export function ContactDetailSidebar({ contact, onClose, onCreateDemand, companyId }: ContactDetailSidebarProps) {
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [registration, setRegistration] = useState<RegistrationInfo | null>(null);
  const [relatedLeads, setRelatedLeads] = useState<LeadInfo[]>([]);
  const navigate = useNavigate();

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!companyId) return;

    // Fetch lead if linked
    if (contact.lead_id) {
      supabase
        .from("crm_leads")
        .select("id, company_name, stage, value_mrr, contact_name, created_at")
        .eq("id", contact.lead_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setLead(data);
        });
    }

    // Fetch related leads by phone
    supabase
      .from("crm_leads")
      .select("id, company_name, stage, value_mrr, contact_name, created_at")
      .eq("servidor_id", companyId)
      .eq("phone", contact.phone)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setRelatedLeads(data || []);
      });

    // Fetch registration if lead linked
    if (contact.lead_id) {
      supabase
        .from("crm_client_registrations")
        .select("id, nome_completo, plano_contratado, client_status")
        .eq("lead_id", contact.lead_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setRegistration(data as RegistrationInfo);
        });
    }
  }, [contact, companyId]);

  const statusColors: Record<string, string> = {
    aguardando: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    em_atendimento: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    encerrado: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="w-[300px] lg:w-[320px] shrink-0 border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Detalhes</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Contact card */}
          <div className="text-center space-y-3">
            <Avatar className="h-16 w-16 mx-auto">
              {contact.avatar_url && <AvatarImage src={contact.avatar_url} />}
              <AvatarFallback className="bg-emerald-500 text-white text-lg font-semibold">
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{contact.name}</h3>
              <p className="text-xs text-muted-foreground">{contact.phone}</p>
            </div>
            <Badge variant="outline" className={statusColors[contact.conversation_status] || statusColors.aguardando}>
              {contact.conversation_status === "em_atendimento" ? "Em atendimento" :
               contact.conversation_status === "encerrado" ? "Encerrado" : "Aguardando"}
            </Badge>
          </div>

          <Separator />

          {/* Quick info */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground">{contact.phone}</span>
            </div>
            {contact.workspace_id && (
              <div className="flex items-center gap-2.5 text-xs">
                <KanbanSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-foreground">Workspace vinculado</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground">
                Criado em {format(new Date(contact.created_at || new Date()), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Labels */}
          {contact.labels && contact.labels.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Etiquetas</h4>
                <div className="flex flex-wrap gap-1">
                  {contact.labels.map((label, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] h-5">
                      <Tag className="h-2.5 w-2.5 mr-1" />
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* CRM - Lead info */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">CRM</h4>

            {lead ? (
              <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{lead.company_name}</span>
                  <Badge variant="outline" className="text-[9px] h-4">{lead.stage}</Badge>
                </div>
                {lead.contact_name && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <User className="h-3 w-3" />
                    {lead.contact_name}
                  </div>
                )}
                <Button
                  size="sm" variant="ghost"
                  className="h-7 w-full text-xs gap-1.5 text-primary hover:text-primary"
                  onClick={() => navigate(`/atendimento?lead=${lead.id}`)}
                >
                  <ExternalLink className="h-3 w-3" /> Abrir no CRM
                </Button>
              </div>
            ) : relatedLeads.length > 0 ? (
              <div className="space-y-1.5">
                {relatedLeads.slice(0, 3).map(rl => (
                  <button
                    key={rl.id}
                    onClick={() => navigate(`/atendimento?lead=${rl.id}`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-xs font-medium text-foreground truncate">{rl.company_name}</span>
                    <Badge variant="outline" className="text-[9px] h-4 shrink-0">{rl.stage}</Badge>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum lead vinculado</p>
            )}
          </div>

          {/* Client */}
          {registration && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</h4>
                <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/30">
                  <span className="text-xs font-medium text-foreground">{registration.nome_completo}</span>
                  {registration.plano_contratado && (
                    <p className="text-[11px] text-muted-foreground">Plano: {registration.plano_contratado}</p>
                  )}
                  <Badge variant="outline" className="text-[9px] h-4">
                    {registration.client_status}
                  </Badge>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ações</h4>
            <Button
              size="sm" variant="default"
              className="w-full h-9 text-xs gap-2 rounded-lg"
              onClick={onCreateDemand}
            >
              <Plus className="h-3.5 w-3.5" />
              Abrir Demanda no Kanban
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
