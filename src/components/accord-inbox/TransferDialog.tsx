import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: string) => void;
  companyId: string | null | undefined;
}

interface UserOption {
  user_id: string;
  name: string;
  email: string;
}

export function TransferDialog({ open, onOpenChange, onConfirm, companyId }: TransferDialogProps) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      setLoading(true);
      supabase
        .from("profiles")
        .select("user_id, name, email")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name")
        .then(({ data }) => {
          setUsers((data || []) as UserOption[]);
          setLoading(false);
        });
    }
  }, [open, companyId]);

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Conversa</DialogTitle>
          <DialogDescription>Selecione o usuário para receber esta conversa.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {users.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => onConfirm(u.user_id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </button>
              ))}
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário encontrado.</p>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
