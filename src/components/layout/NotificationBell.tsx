import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Clock, UserPlus, Megaphone, CalendarClock, Eye, EyeOff, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  metadata: any;
  created_at: string;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeCompanyId = useActiveCompanyId();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "read">("unread");

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const now = new Date();
    const visible = ((data as Notification[]) || []).filter((n) => {
      if (n.type === "reminder" && n.metadata?.reminder_at) {
        return new Date(n.metadata.reminder_at) <= now;
      }
      return true;
    });

    setNotifications(visible);
    setUnreadCount(visible.filter((n) => !n.is_read).length);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`,
      }, () => fetchNotifications())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const toggleRead = async (id: string, currentlyRead: boolean) => {
    await supabase.from("notifications").update({ is_read: !currentlyRead }).eq("id", id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    fetchNotifications();
  };

  const markAllAsUnread = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: false }).eq("user_id", user.id).eq("is_read", true);
    fetchNotifications();
  };

  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.is_read), [notifications]);
  const readNotifications = useMemo(() => notifications.filter((n) => n.is_read), [notifications]);
  const todayReadCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return readNotifications.length;
  }, [readNotifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case "user_pending": return <UserPlus className="h-4 w-4 text-amber-500" />;
      case "user_approved": return <Check className="h-4 w-4 text-emerald-500" />;
      case "announcement": return <Megaphone className="h-4 w-4 text-primary" />;
      case "reminder": return <CalendarClock className="h-4 w-4 text-destructive" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " - " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const activeList = tab === "unread" ? unreadNotifications : readNotifications;
  const allRead = unreadNotifications.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl h-10 w-10">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 rounded-xl">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setTab("unread")}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === "unread"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {unreadNotifications.length} recebidas hoje
          </button>
          <button
            onClick={() => setTab("read")}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === "read"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {todayReadCount} lidas hoje
          </button>
        </div>

        <ScrollArea className="max-h-[400px]">
          {/* All-read state */}
          {tab === "unread" && allRead && (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <CircleCheck className="h-9 w-9 text-emerald-500" />
              </div>
              <p className="font-semibold text-sm text-foreground">Você está em dia</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hoje você recebeu {notifications.length} notificações e leu {todayReadCount}
              </p>
            </div>
          )}

          {/* Section label */}
          {((tab === "unread" && !allRead) || tab === "read") && activeList.length > 0 && (
            <p className="text-[11px] text-muted-foreground font-medium px-4 pt-3 pb-1">
              {tab === "unread" ? "Notificações não lidas" : "Últimas notificações lidas"}
            </p>
          )}

          {/* Empty read */}
          {tab === "read" && activeList.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhuma notificação lida
            </div>
          )}

          {/* Notification cards */}
          <div className="px-3 pb-3 space-y-2 mt-1">
            {activeList.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (n.link) {
                    if (!n.is_read) toggleRead(n.id, false);
                    setOpen(false);
                    navigate(n.link);
                  }
                }}
                className={`rounded-lg border p-3 transition-colors cursor-pointer ${
                  !n.is_read
                    ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/30"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-muted-foreground/70">{formatDate(n.created_at)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRead(n.id, n.is_read);
                        }}
                        className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {n.is_read ? (
                          <><EyeOff className="h-3 w-3" /> Marcar como não lida</>
                        ) : (
                          <><Eye className="h-3 w-3" /> Marcar como lida</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Read section when on unread tab */}
          {tab === "unread" && readNotifications.length > 0 && (
            <>
              <div className="border-t mx-3" />
              <p className="text-[11px] text-muted-foreground font-medium px-4 pt-3 pb-1">Últimas notificações lidas</p>
              <div className="px-3 pb-3 space-y-2 mt-1">
                {readNotifications.slice(0, 3).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (n.link) {
                        setOpen(false);
                        navigate(n.link);
                      }
                    }}
                    className="rounded-lg border border-border bg-card p-3 transition-colors cursor-pointer hover:bg-muted/50"
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-muted-foreground/70">{formatDate(n.created_at)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRead(n.id, true);
                            }}
                            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <EyeOff className="h-3 w-3" /> Marcar como não lida
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2.5 text-center">
          <button
            onClick={unreadCount > 0 ? markAllAsRead : markAllAsUnread}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
          >
            <Eye className="h-3 w-3" />
            {unreadCount > 0
              ? `Marcar todas como lidas · Leu ${todayReadCount} das ${notifications.length} hoje`
              : `Marcar todas como não lidas · Leu ${todayReadCount} das ${notifications.length} hoje`
            }
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
