import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QuickActions } from "@/components/home/QuickActions";
import { AnnouncementsCarousel } from "@/components/home/AnnouncementsCarousel";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { SupportDialog } from "@/components/home/SupportDialog";
import { ManageAnnouncementsDialog } from "@/components/home/ManageAnnouncementsDialog";
import { BirthdayBanner } from "@/components/home/BirthdayBanner";
import { BirthdayCard } from "@/components/home/BirthdayCard";
import { BirthdayCelebration } from "@/components/home/BirthdayCelebration";
import { HighlightedEventsCarousel } from "@/components/home/HighlightedEventsCarousel";
import { OperationsCommandCenter } from "@/components/home/OperationsCommandCenter";

interface Announcement {
  id: string; title: string; image_url: string; description: string | null;
}

export default function Home() {
  const { isAdmin, isMaster, activeCompanyId } = useAuth();
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
      <BirthdayCelebration />

      <BirthdayBanner key={refreshKey} onSaved={() => setRefreshKey((k) => k + 1)} />

      <OperationsCommandCenter
        isAdmin={isAdmin}
        onManageAnnouncements={() => setManageOpen(true)}
        onSupport={() => setSupportOpen(true)}
      />

      <QuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <BirthdayCard />
          <HighlightedEventsCarousel />
          <AnnouncementsCarousel />
        </div>
        <div className="min-h-[300px]">
          <ActivityFeed />
        </div>
      </div>

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
