import { ReactNode } from "react";

/**
 * HexAvatar — avatar hexagonal estilo Bitrix.
 *
 * Usa clip-path para recortar um div quadrado em formato de hexágono.
 * Pode receber uma imagem (src), uma string (initials) ou um ícone (children).
 */
export interface HexAvatarProps {
  /** Tamanho em px (lado a lado). Default 44. */
  size?: number;
  /** Cor sólida ou gradiente CSS de fundo. */
  background?: string;
  /** URL de imagem (se fornecida, ignora initials/children). */
  src?: string | null;
  /** Iniciais (1–3 chars). */
  initials?: string;
  /** Conteúdo livre (ícone, etc) — usado se não houver src/initials. */
  children?: ReactNode;
  /** Classes extras. */
  className?: string;
  /** Título acessível. */
  title?: string;
}

const HEX_CLIP = "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)";

export function HexAvatar({
  size = 44,
  background = "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  src,
  initials,
  children,
  className,
  title,
}: HexAvatarProps) {
  const fontSize = Math.max(11, Math.round(size * 0.32));
  return (
    <div
      title={title}
      className={className}
      style={{
        width: size,
        height: size,
        clipPath: HEX_CLIP,
        background: src ? "transparent" : background,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize,
        letterSpacing: "-0.01em",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {src ? (
        <img
          src={src}
          alt={title || ""}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : initials ? (
        initials.slice(0, 3).toUpperCase()
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Gera um gradiente determinístico verde/azul/violeta a partir de um id.
 * Útil pra dar variação visual aos hexágonos da lista de collabs.
 */
export function hexGradientFor(id: string): string {
  const palette = [
    "linear-gradient(135deg, #10b981 0%, #059669 100%)", // emerald
    "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", // blue
    "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)", // violet
    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", // amber
    "linear-gradient(135deg, #ec4899 0%, #be185d 100%)", // pink
    "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)", // teal
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}
