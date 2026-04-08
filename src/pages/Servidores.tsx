import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Check, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Servidores() {
  const navigate = useNavigate();
  const { companies, activeCompanyId, setActiveCompanyId } = useAuth();

  const handleSelect = (companyId: string) => {
    setActiveCompanyId(companyId);
    navigate("/home");
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Servidores</h1>
            <p className="text-sm text-muted-foreground">Selecione um servidor para acessar</p>
          </div>
        </div>

        {companies.length === 0 ? (
          <Card className="p-8 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum servidor encontrado.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {companies.map((company) => {
              const isActive = activeCompanyId === company.id;
              return (
                <Card
                  key={company.id}
                  onClick={() => handleSelect(company.id)}
                  className={`flex items-center gap-4 p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/40 ${
                    isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                      {company.nome_fantasia || company.razao_social}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{company.cnpj}</p>
                  </div>
                  {isActive ? (
                    <Badge variant="outline" className="border-primary/30 text-primary text-[10px] shrink-0">
                      <Check className="h-3 w-3 mr-1" /> Ativo
                    </Badge>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
