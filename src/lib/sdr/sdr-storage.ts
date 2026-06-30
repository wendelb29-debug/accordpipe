// SDR types + Supabase-backed CRUD (substitui o localStorage do projeto origem).
import { supabase } from "@/integrations/supabase/client";

export type DiscKey = "D" | "I" | "S" | "C";
export type LeadStage = "novo" | "qualificacao" | "fechamento" | "ganho" | "perdido" | "qualificado";
export type LeadOrigin = "cold-call" | "cold-email" | "social" | "inbound";
export type LeadTemp = "frio" | "morno" | "quente";

export type QualAnswers = {
  bant?: { budget?: string; authority?: string; need?: string; timeline?: string };
  champ?: { challenge?: string; authority?: string; money?: string; prioritization?: string };
  gpct?: { goals?: string; plans?: string; challenges?: string; timeline?: string };
  spin?: { situation?: string; problem?: string; implication?: string; need?: string };
};

export type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "client" | "sdr";
  content: string;
  ts: number;
};

export type Lead = {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  company: string;
  origin: LeadOrigin;
  channel: string;
  stage: LeadStage;
  temp?: LeadTemp;
  disc?: DiscKey;
  qual: QualAnswers;
  conversation: ChatMsg[];
  notes?: string;
  workspaceId?: string | null;
  servidorId?: string;
};

const CONV_KEY = (id: string) => `sdr-os:conv:${id}`;

function loadConversation(id: string): ChatMsg[] {
  try {
    const raw = localStorage.getItem(CONV_KEY(id));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversation(id: string, conv: ChatMsg[]) {
  try { localStorage.setItem(CONV_KEY(id), JSON.stringify(conv)); } catch { /* noop */ }
}

function rowToLead(row: any): Lead {
  return {
    id: row.id,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    name: row.name ?? "",
    company: row.company ?? "",
    origin: (row.origin ?? "cold-call") as LeadOrigin,
    channel: row.channel ?? "",
    stage: (row.stage ?? "novo") as LeadStage,
    temp: row.temperature ?? undefined,
    disc: (row.disc ?? undefined) as DiscKey | undefined,
    qual: (row.qual ?? {}) as QualAnswers,
    notes: row.notes ?? undefined,
    workspaceId: row.workspace_id,
    servidorId: row.servidor_id,
    conversation: loadConversation(row.id),
  };
}

export async function fetchLeads(opts?: { workspaceId?: string | null }): Promise<Lead[]> {
  let q = supabase.from("sdr_leads" as any).select("*").order("updated_at", { ascending: false });
  if (opts?.workspaceId) q = q.eq("workspace_id", opts.workspaceId);
  const { data, error } = await q;
  if (error) { console.error("fetchLeads", error); return []; }
  return (data ?? []).map(rowToLead);
}

export function classifyTemperature(lead: Lead): LeadTemp {
  const b = lead.qual.bant ?? {};
  const filled = [b.budget, b.authority, b.need, b.timeline].filter(Boolean).length;
  if (filled >= 4) return "quente";
  if (filled >= 2) return "morno";
  return "frio";
}

export async function createLead(input: { name: string; company?: string; origin?: LeadOrigin; channel?: string; workspaceId?: string | null; servidorId: string; ownerId?: string | null }): Promise<Lead | null> {
  const payload: any = {
    name: input.name,
    company: input.company ?? "",
    origin: input.origin ?? "cold-call",
    channel: input.channel ?? "",
    workspace_id: input.workspaceId ?? null,
    servidor_id: input.servidorId,
    owner_id: input.ownerId ?? null,
    stage: "novo",
    qual: {},
  };
  const { data, error } = await supabase.from("sdr_leads" as any).insert(payload).select().single();
  if (error) { console.error("createLead", error); return null; }
  return rowToLead(data);
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
  const row: any = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.company !== undefined) row.company = patch.company;
  if (patch.origin !== undefined) row.origin = patch.origin;
  if (patch.channel !== undefined) row.channel = patch.channel;
  if (patch.stage !== undefined) row.stage = patch.stage;
  if (patch.temp !== undefined) row.temperature = patch.temp;
  if (patch.disc !== undefined) row.disc = patch.disc;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.qual !== undefined) row.qual = patch.qual;
  if (patch.conversation !== undefined) saveConversation(id, patch.conversation);

  if (Object.keys(row).length === 0) {
    const conv = patch.conversation ?? loadConversation(id);
    const { data } = await supabase.from("sdr_leads" as any).select("*").eq("id", id).single();
    if (!data) return null;
    const lead = rowToLead(data);
    lead.conversation = conv;
    return lead;
  }
  const { data, error } = await supabase.from("sdr_leads" as any).update(row).eq("id", id).select().single();
  if (error) { console.error("updateLead", error); return null; }
  const lead = rowToLead(data);
  if (patch.conversation) lead.conversation = patch.conversation;
  return lead;
}

export async function deleteLead(id: string): Promise<void> {
  await supabase.from("sdr_leads" as any).delete().eq("id", id);
  try { localStorage.removeItem(CONV_KEY(id)); } catch { /* noop */ }
}

export async function promoteLead(sdrLeadId: string, targetWorkspaceId: string): Promise<{ leadId?: string; error?: string }> {
  const { data, error } = await supabase.rpc("promote_sdr_lead" as any, {
    _sdr_lead_id: sdrLeadId,
    _target_workspace_id: targetWorkspaceId,
  });
  if (error) return { error: error.message };
  return { leadId: data as unknown as string };
}
