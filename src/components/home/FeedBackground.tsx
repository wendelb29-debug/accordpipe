/**
 * FeedBackground — fundo "céu azul / horizonte" inspirado no Bitrix24.
 *
 * Reproduz a sensação do cover azul do Bitrix (sem usar a imagem deles):
 * degradê de céu, um brilho de horizonte mais claro à direita e uma
 * textura sutil de "estrelas". Os cards brancos do feed flutuam por cima.
 *
 * Mantém a faixa superior mais clara para que textos escuros que ficam
 * direto sobre o fundo (ex.: o título "Feed") continuem legíveis.
 *
 * Preenche a tela de forma fixa atrás do conteúdo (-z-10) e não captura cliques.
 * Adapta-se ao modo escuro automaticamente.
 */
export function FeedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Céu base — degradê azul, mais claro no topo */}
      <div
        className="absolute inset-0
                   bg-[linear-gradient(180deg,#dbe9fb_0%,#bcd6f5_22%,#8fb6ec_52%,#5d8fd8_100%)]
                   dark:bg-[linear-gradient(180deg,#0e1b33_0%,#102444_45%,#0c2c5a_100%)]"
      />

      {/* Brilho de horizonte (claro, deslocado à direita) — a "luz" do céu */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 520px at 78% 30%, rgba(255,255,255,0.55), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(1000px 480px at 80% 28%, rgba(96,165,250,0.28), transparent 60%)",
        }}
      />

      {/* Reforço de azul nas bordas inferiores para dar profundidade */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(40,86,168,0.30))",
        }}
      />

      {/* Textura sutil de estrelas/poeira */}
      <div
        className="absolute inset-0 opacity-[0.5] dark:opacity-[0.7] mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.9) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 36% 9%, rgba(255,255,255,0.7) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 64% 22%, rgba(255,255,255,0.8) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 82% 12%, rgba(255,255,255,0.7) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 91% 34%, rgba(255,255,255,0.6) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 22% 42%, rgba(255,255,255,0.5) 50%, transparent 51%)",
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
}
