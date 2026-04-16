import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Megaphone, HeadphonesIcon } from "lucide-react";
import { WelcomeBanner } from "@/components/home/WelcomeBanner";
import { QuickActions } from "@/components/home/QuickActions";
import { AnnouncementsCarousel } from "@/components/home/AnnouncementsCarousel";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { StatsOverview } from "@/components/home/StatsOverview";
import { SupportDialog } from "@/components/home/SupportDialog";
import { ManageAnnouncementsDialog } from "@/components/home/ManageAnnouncementsDialog";
import { BirthdayBanner } from "@/components/home/BirthdayBanner";
import { BirthdayCard } from "@/components/home/BirthdayCard";
import { BirthdayCelebration } from "@/components/home/BirthdayCelebration";
import { HighlightedEventsCarousel } from "@/components/home/HighlightedEventsCarousel";

interface Announcement {
  id: string; title: string; image_url: string; description: string | null;
}

export default function Home() {
  const { isAdmin, isMaster, activeCompanyId, profile } = useAuth();
  const [supportOpen, setSupportOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAnnouncements = useCallback(async () => {
    let q = supabase.from("announcements").select("id,title,image_url,description")
      .eq("is_active", true).order("display_order");
    if (isMaster && activeCompanyId) q = q.eq("servidor_id", activeCompanyId);
    const { data } = await q;
    setAnnouncements((data as Announcement[]) || []);
  }, [isMaster, activeCompanyId]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  return (
    <div className="space-y-5">
      {/* Birthday celebration modal + confetti */}
      <BirthdayCelebration />

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setManageOpen(true)}>
              <Megaphone className="h-4 w-4" /> Comunicados
            </Button>
          )}
          <Button size="sm" className="gap-2 gradient-primary text-primary-foreground shadow-md" onClick={() => setSupportOpen(true)}>
            <HeadphonesIcon className="h-4 w-4" /> Suporte
          </Button>
        </div>
      </div>

      {/* Birthday banner (missing birth date) */}
      <BirthdayBanner key={refreshKey} onSaved={() => setRefreshKey((k) => k + 1)} />

      {/* Welcome */}
      <WelcomeBanner />

      {/* Stats */}
      <StatsOverview />

      {/* Birthday card */}
      <BirthdayCard />

      {/* Quick actions */}
      <QuickActions />

      {/* Highlighted events */}
      <HighlightedEventsCarousel />

      {/* Main content: announcements + activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnnouncementsCarousel />
        </div>
        <div className="min-h-[300px]">
          <ActivityFeed />
        </div>
      </div>

      {/* Dialogs */}
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
      <ManageAnnouncementsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        announcements={announcements}
        onRefresh={fetchAnnouncements}
      />
    </div>
  );
}
