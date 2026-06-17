/**
 * FeedBackground — fundo off-white sólido estilo LinkedIn.
 *
 * Cinza quente claro no light mode, carvão suave no dark mode.
 * Sem gradientes, sem texturas, sem brilhos. O contraste vem
 * do branco puro dos cards do feed sobre esse fundo cinza claro.
 *
 * Preenche a tela de forma fixa atrás do conteúdo (-z-10).
 * Não captura cliques.
 */
export function FeedBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background: "var(--feed-bg, #F4F2EE)",
      }}
      aria-hidden
    />
  );
}
