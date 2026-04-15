import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EVENT_TYPES, type EventFormData, type TenantEvent } from "@/hooks/useEvents";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: EventFormData) => void;
  event?: TenantEvent | null;
  loading?: boolean;
}

export function EventFormDialog({ open, onOpenChange, onSubmit, event, loading }: Props) {
  const [form, setForm] = useState<EventFormData>({
    title: "",
    event_type: "reunião",
    start_at: "",
    end_at: "",
    description: "",
    location: "",
    meeting_url: "",
    target_mode: "all",
    is_mandatory: false,
  });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        event_type: event.event_type,
        start_at: event.start_at?.slice(0, 16) ?? "",
        end_at: event.end_at?.slice(0, 16) ?? "",
        description: event.description ?? "",
        location: event.location ?? "",
        meeting_url: event.meeting_url ?? "",
        target_mode: event.target_mode,
        is_mandatory: event.is_mandatory,
      });
    } else {
      setForm({ title: "", event_type: "reunião", start_at: "", end_at: "", description: "", location: "", meeting_url: "", target_mode: "all", is_mandatory: false });
    }
  }, [event, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Editar Evento" : "Novo Evento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Tipo do Evento</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início *</Label>
              <Input type="datetime-local" required value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="datetime-local" value={form.end_at ?? ""} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Local</Label>
            <Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Sala 3, Escritório..." />
          </div>
          <div>
            <Label>Link da Reunião</Label>
            <Input value={form.meeting_url ?? ""} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://meet.google.com/..." />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_mandatory} onCheckedChange={(v) => setForm({ ...form, is_mandatory: v })} />
            <Label>Evento obrigatório</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{event ? "Salvar" : "Criar Evento"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
