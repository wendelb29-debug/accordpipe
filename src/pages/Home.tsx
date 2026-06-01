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
    // Sangra para as bordas da <main> (cancela o padding) e fica ABAIXO do header.
    // O fundo azul (absolute) preenche só a área do feed, nunca atrás/acima da barra.
    <div className="relative z-0 -mx-3 -mt-3 -mb-3 min-h-[calc(100vh-56px)] lg:-mx-4 lg:-mt-4">
      <FeedBackground />

      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-3 pt-4 pb-10 sm:px-4">
        <BirthdayCelebration />
        <BirthdayBanner key={refreshKey} onSaved={() => setRefreshKey((k) => k + 1)} />

        {/* Faixa de capa do feed */}
        <div className="pt-1 pb-5">
          <WelcomeHero />
        </div>

        {/* Feed centralizado · sidebar de widgets à direita */}
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_312px] xl:grid-cols-[minmax(0,700px)_312px] xl:justify-center">
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
    </div>
  );
}
