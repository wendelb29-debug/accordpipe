import { SocialFeed } from "@/components/home/SocialFeed";
import { BirthdayCard } from "@/components/home/BirthdayCard";
import { BirthdayCelebration } from "@/components/home/BirthdayCelebration";
import { BirthdayBanner } from "@/components/home/BirthdayBanner";
import { QuickSummaryCard } from "@/components/home/QuickSummaryCard";
import { ConstellationBackground } from "@/components/ui/ConstellationBackground";
import { WelcomeHero } from "@/components/home/WelcomeHero";
import { useState } from "react";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="relative mx-auto w-full max-w-[1280px]">
      {/* Animated constellation background (fixed behind content) */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <ConstellationBackground />
      </div>

      {/* ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-[320px] bg-gradient-to-b from-primary/10 via-violet-500/5 to-transparent blur-3xl" />

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
