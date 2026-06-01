import { SocialFeed } from "@/components/home/SocialFeed";
import { BirthdayCard } from "@/components/home/BirthdayCard";
import { BirthdayCelebration } from "@/components/home/BirthdayCelebration";
import { BirthdayBanner } from "@/components/home/BirthdayBanner";
import { QuickSummaryCard } from "@/components/home/QuickSummaryCard";
import { FeedBackground } from "@/components/home/FeedBackground";
import { WelcomeHero } from "@/components/home/WelcomeHero";
import { useState } from "react";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="relative mx-auto w-full max-w-[1280px]">
      {/* Bitrix-style blue sky background (fixed behind content) */}
      <FeedBackground />


      <BirthdayCelebration />
      <BirthdayBanner key={refreshKey} onSaved={() => setRefreshKey((k) => k + 1)} />

      {/* Premium welcome hero */}
      <div className="pt-2 pb-5">
        <WelcomeHero />
      </div>

      {/* Feed centralizado · sidebar minimalista à direita */}
      <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,680px)_300px] xl:justify-center">
        <main className="min-w-0">
          <SocialFeed />
        </main>
        <aside className="hidden lg:block">
          <div className="sticky top-4 space-y-4">
            <QuickSummaryCard />
            <BirthdayCard />
          </div>
        </aside>
      </div>
    </div>
  );
}
