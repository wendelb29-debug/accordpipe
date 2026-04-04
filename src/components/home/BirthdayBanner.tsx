import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BirthdayBannerProps {
  onSaved: () => void;
}

export function BirthdayBanner({ onSaved }: BirthdayBannerProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [saving, setSaving] = useState(false);

  // If profile has birth_date, don't show banner
  if ((profile as any)?.birth_date) return null;

  const handleSave = async () => {
    if (!date || !profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ birth_date: format(date, "yyyy-MM-dd") } as any)
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar data de nascimento");
    } else {
      toast.success("Data de nascimento salva com sucesso!");
      setOpen(false);
      onSaved();
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-orange-300/50 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800/50 p-4">
        <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
        <p className="text-sm text-orange-800 dark:text-orange-300 flex-1">
          ⚠️ Complete seu perfil: adicione sua <strong>data de nascimento</strong> para personalizar sua experiência.
        </p>
        <Button size="sm" variant="outline" className="shrink-0 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300" onClick={() => setOpen(true)}>
          Cadastrar agora
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🎂 Data de Nascimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe sua data de nascimento para que possamos celebrar seu aniversário!
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d > new Date() || d < new Date("1920-01-01")}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  captionLayout="dropdown-buttons"
                  fromYear={1940}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
            <Button className="w-full" onClick={handleSave} disabled={!date || saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
