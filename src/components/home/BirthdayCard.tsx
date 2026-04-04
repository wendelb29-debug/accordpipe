import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake } from "lucide-react";

interface BirthdayUser {
  user_id: string;
  name: string;
  avatar_url: string | null;
  birth_date: string;
}

export function BirthdayCard() {
  const { profile, isMaster, activeCompanyId } = useAuth();
  const companyId = isMaster ? activeCompanyId : profile?.company_id;
  const [birthdays, setBirthdays] = useState<BirthdayUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBirthdays();
  }, [companyId]);

  const fetchBirthdays = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_today_birthdays", {
      _company_id: companyId || null,
    });
    if (!error && data) {
      setBirthdays(data as BirthdayUser[]);
    }
    setLoading(false);
  };

  if (loading) return null;

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-[hsl(var(--primary)/0.08)] to-[hsl(263,87%,60%,0.08)]">
        <CardTitle className="text-base flex items-center gap-2">
          <Cake className="h-5 w-5 text-pink-500" />
          🎉 Aniversariantes de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {birthdays.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            🎈 Nenhum aniversariante hoje
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {birthdays.map((b) => (
              <div key={b.user_id} className="flex flex-col items-center gap-2 min-w-[80px] group cursor-default">
                <div className="relative">
                  <Avatar className="h-14 w-14 ring-2 ring-pink-400/50 shadow-lg group-hover:scale-105 transition-transform">
                    <AvatarImage src={b.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-primary-foreground font-bold">
                      {b.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 text-lg">🎂</span>
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight max-w-[80px] truncate">
                  {b.name?.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
