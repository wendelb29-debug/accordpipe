import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Department = { name: string; color?: string | null };
type PublicProfile = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  status: string | null;
  created_at: string;
  departments: Department[];
};

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function PerfilPublico() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_profile", { p_user_id: userId });
      if (cancelled) return;
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setProfile(null);
      } else {
        const row = (Array.isArray(data) ? data[0] : data) as any;
        setProfile({
          user_id: row.user_id,
          name: row.name,
          avatar_url: row.avatar_url,
          status: row.status,
          created_at: row.created_at,
          departments: Array.isArray(row.departments) ? row.departments : [],
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      {loading ? (
        <Card className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : !profile ? (
        <Card className="p-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">Perfil indisponível</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Este perfil não está disponível ou não pertence à sua equipe.
          </p>
        </Card>
      ) : (
        <Card className="p-8">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-28 w-28 mb-4">
              {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.name || ""} /> : null}
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>

            <h1 className="text-2xl font-bold text-foreground">{profile.name || "Colega"}</h1>

            {profile.departments.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {profile.departments.map((d, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    style={
                      d.color
                        ? {
                            borderColor: d.color,
                            color: d.color,
                            backgroundColor: `${d.color}1A`,
                          }
                        : undefined
                    }
                  >
                    {d.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <Badge variant="outline" className="mt-3">Sem departamento</Badge>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              Membro desde {format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: ptBR })}
            </p>

            <Button
              className="mt-6 gap-2"
              onClick={() => navigate(`/collabs?dm=${profile.user_id}`)}
            >
              <MessageSquare className="h-4 w-4" />
              Iniciar conversa
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
