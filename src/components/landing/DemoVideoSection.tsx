import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoVideoSection() {
  return (
    <section className="border-y border-border/50 bg-muted/30">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tudo em um único painel
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Assista uma demonstração rápida e veja o ACCORD em ação.
          </p>
        </div>
        <div className="relative mx-auto aspect-video max-w-4xl rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
          <div className="relative flex flex-col items-center gap-4">
            <a href="mailto:contato@accordhub.com.br?subject=Solicitar demonstração">
              <Button
                size="lg"
                className="gap-3 rounded-full px-8 text-base shadow-lg shadow-primary/25"
              >
                <Play className="h-5 w-5" />
                Assistir Demonstração
              </Button>
            </a>
            <p className="text-sm text-muted-foreground">Duração: ~3 minutos</p>
          </div>
        </div>
      </div>
    </section>
  );
}
