import { SocialFeed } from "@/components/home/SocialFeed";
import { BirthdayCard } from "@/components/home/BirthdayCard";
import { BirthdayCelebration } from "@/components/home/BirthdayCelebration";
import { BirthdayBanner } from "@/components/home/BirthdayBanner";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export default function Home() {
  const { profile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = (profile?.name || "").split(" ")[0] || "";

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <BirthdayCelebration />
      <BirthdayBanner key={refreshKey} onSaved={() => setRefreshKey((k) => k + 1)} />

      {/* Greeting header — minimal, no dashboard chrome */}
      <header className="px-1 pt-2 pb-5">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {greet}, <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">{firstName}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fique por dentro do que está acontecendo na sua equipe.
        </p>
      </header>

      {/* Feed centralizado + rail lateral minimalista */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,720px)_320px] xl:justify-center">
        <main className="min-w-0">
          <SocialFeed />
        </main>
        <aside className="hidden lg:block space-y-4">
          <div className="sticky top-4 space-y-4">
            <BirthdayCard />
            <div className="rounded-2xl border border-border/60 bg-card/80 overflow-hidden">
              <ActivityFeed />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
