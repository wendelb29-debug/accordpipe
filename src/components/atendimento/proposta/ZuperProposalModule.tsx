import { useState } from "react";
import { NewProposalModal } from "./NewProposalModal";
import { ZuperProposalForm } from "./ZuperProposalForm";
import { ZuperProposalList } from "./ZuperProposalList";
import type { ProposalRecord, ProposalTemplate } from "./types";

interface LeadLite {
  id: string; name: string | null; email?: string | null;
  phone?: string | null; company_name?: string | null;
  servidor_id: string;
}

export function ZuperProposalModule({ lead, servidorId }: { lead: LeadLite; servidorId: string }) {
  const [view, setView] = useState<"list" | "form">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProposalRecord | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<ProposalTemplate | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {view === "list" ? (
        <div className="h-full min-h-0 overflow-y-auto p-4">
          <ZuperProposalList
            leadId={lead.id}
            servidorId={servidorId}
            refreshKey={refreshKey}
            onNew={() => { setEditing(null); setPendingTemplate(null); setModalOpen(true); }}
            onOpen={(p) => { setEditing(p); setView("form"); }}
          />
        </div>
      ) : (
        <ZuperProposalForm
          lead={lead}
          servidorId={servidorId}
          existingProposal={editing}
          initialTemplate={pendingTemplate}
          onClose={() => { setView("list"); setEditing(null); setPendingTemplate(null); setRefreshKey(k => k + 1); }}
          onSaved={(p) => { setEditing(p); setRefreshKey(k => k + 1); }}
        />
      )}

      <NewProposalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        servidorId={servidorId}
        onConfirm={(mode, template) => {
          setPendingTemplate(mode === "template" ? template || null : null);
          setEditing(null);
          setView("form");
        }}
      />
    </div>
  );
}
