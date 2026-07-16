import { List, Settings, FileText, Plus, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type WhatsAppPill = "list" | "instance" | "uazapi" | "templates" | "create-template";

interface Props {
  active: WhatsAppPill;
  onChange: (p: WhatsAppPill) => void;
  channelName?: string | null;
}

const baseCls =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap";

export function WhatsAppPillNav({ active, onChange, channelName }: Props) {
  const pill = (id: WhatsAppPill, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => onChange(id)}
      className={cn(
        baseCls,
        active === id
          ? "bg-primary text-primary-foreground shadow"
          : "bg-muted text-foreground hover:bg-muted/70"
      )}
    >
      {icon}
      <span className="truncate max-w-[220px]">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pill("list", <List className="h-4 w-4" />, "Lista")}
      {pill(
        "instance",
        <Settings className="h-4 w-4" />,
        channelName || "Instância"
      )}
      {pill("templates", <FileText className="h-4 w-4" />, "Templates")}
      {pill("create-template", <Plus className="h-4 w-4" />, "Criar template")}
    </div>
  );
}
