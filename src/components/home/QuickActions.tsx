import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import {
  Users, FileText, BarChart3, MessageSquare, FolderOpen, Receipt,
} from "lucide-react";

const actions = [
  { label: "CRM", icon: Users, path: "/atendimento", color: "hsl(var(--primary))" },
  { label: "Contratos", icon: FileText, path: "/contratos", color: "hsl(263, 87%, 60%)" },
  { label: "Dashboard", icon: BarChart3, path: "/dashboard", color: "hsl(152, 55%, 40%)" },
  { label: "Documentos", icon: FolderOpen, path: "/documentos", color: "hsl(32, 95%, 50%)" },
  { label: "Financeiro", icon: Receipt, path: "/financeiro", color: "hsl(0, 72%, 51%)" },
  { label: "Inbox", icon: MessageSquare, path: "/accord-stack", color: "hsl(200, 80%, 50%)" },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {actions.map((a) => (
        <Card
          key={a.path}
          onClick={() => navigate(a.path)}
          className="flex flex-col items-center justify-center gap-2 p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-border/60"
        >
          <div
            className="flex items-center justify-center h-10 w-10 rounded-xl"
            style={{ backgroundColor: `${a.color}15`, color: a.color }}
          >
            <a.icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-foreground">{a.label}</span>
        </Card>
      ))}
    </div>
  );
}
