import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import {
  Users, FileText, BarChart3, MessageSquare, FolderOpen, Receipt,
} from "lucide-react";
import { BrandIcon, type BrandIconTone } from "@/components/ui/brand-icon";

const actions: { label: string; icon: any; path: string; tone: BrandIconTone }[] = [
  { label: "CRM", icon: Users, path: "/atendimento", tone: "emerald" },
  { label: "Contratos", icon: FileText, path: "/contratos", tone: "violet" },
  { label: "Dashboard", icon: BarChart3, path: "/dashboard", tone: "blue" },
  { label: "Documentos", icon: FolderOpen, path: "/documentos", tone: "sky" },
  { label: "Financeiro", icon: Receipt, path: "/financeiro", tone: "green" },
  { label: "Inbox", icon: MessageSquare, path: "/accord-stack", tone: "cyan" },
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
          <BrandIcon icon={a.icon} tone={a.tone} size="xl" />
          <span className="text-xs font-medium text-foreground">{a.label}</span>
        </Card>
      ))}
    </div>
  );
}
