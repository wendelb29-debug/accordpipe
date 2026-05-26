import { SocialFeed } from "@/components/home/SocialFeed";
import { BirthdayCard } from "@/components/home/BirthdayCard";
import { BirthdayCelebration } from "@/components/home/BirthdayCelebration";
import { BirthdayBanner } from "@/components/home/BirthdayBanner";
import { ConstellationBackground } from "@/components/ui/ConstellationBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export default function Home() {
  const { profile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = (profile?.name || "").split(" ")[0] || "";

  return (
    <div className="relative mx-auto w-full max-w-[1280px]">
      {/* Animated constellation background (fixed behind content) */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <ConstellationBackground />
      </div>

      {/* ambient gradient backdrop — gives the page that social/community feel */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-[320px] bg-gradient-to-b from-primary/10 via-violet-500/5 to-transparent blur-3xl" />

      <BirthdayCelebration />
      <BirthdayBanner key={refreshKey} onSaved={() => setRefreshKey((k) => k + 1)} />

      {/* minimal social header */}
      <header className="relative px-1 pt-3 pb-4">
        <h1 className="text-xl md:text-[22px] font-semibold tracking-tight">
          {greet}, <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">{firstName}</span> 👋
        </h1>
      </header>

      {/* Feed centralizado · sidebar minimalista à direita */}
      <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,680px)_300px] xl:justify-center">
        <main className="min-w-0">
          <SocialFeed />
        </main>
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <BirthdayCard />
          </div>
        </aside>
      </div>
    </div>
  );
}
