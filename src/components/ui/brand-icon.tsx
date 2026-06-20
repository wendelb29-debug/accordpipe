import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BrandIcon – renders a Lucide icon inside a small colored "app-tile"
 * style badge (gradient background, white icon, subtle shadow).
 * Used for sidebar/menu/tab icons across the app to give them a
 * real-app feel (iOS / Notion style) instead of plain line drawings.
 */

export type BrandIconTone =
  | "indigo" | "blue" | "sky" | "cyan" | "teal" | "emerald"
  | "green" | "lime" | "amber" | "orange" | "red" | "rose"
  | "pink" | "fuchsia" | "purple" | "violet" | "slate" | "zinc"
  | "yellow" | "gmail" | "whatsapp" | "drive" | "asaas";

const TONE_BG: Record<BrandIconTone, string> = {
  indigo: "bg-gradient-to-br from-indigo-400 to-indigo-600",
  blue: "bg-gradient-to-br from-blue-400 to-blue-600",
  sky: "bg-gradient-to-br from-sky-400 to-sky-600",
  cyan: "bg-gradient-to-br from-cyan-400 to-cyan-600",
  teal: "bg-gradient-to-br from-teal-400 to-teal-600",
  emerald: "bg-gradient-to-br from-emerald-400 to-emerald-600",
  green: "bg-gradient-to-br from-green-400 to-green-600",
  lime: "bg-gradient-to-br from-lime-400 to-lime-600",
  amber: "bg-gradient-to-br from-amber-400 to-amber-600",
  orange: "bg-gradient-to-br from-orange-400 to-orange-600",
  red: "bg-gradient-to-br from-red-400 to-red-600",
  rose: "bg-gradient-to-br from-rose-400 to-rose-600",
  pink: "bg-gradient-to-br from-pink-400 to-pink-600",
  fuchsia: "bg-gradient-to-br from-fuchsia-400 to-fuchsia-600",
  purple: "bg-gradient-to-br from-purple-400 to-purple-600",
  violet: "bg-gradient-to-br from-violet-400 to-violet-600",
  slate: "bg-gradient-to-br from-slate-400 to-slate-600",
  zinc: "bg-gradient-to-br from-zinc-400 to-zinc-600",
  yellow: "bg-gradient-to-br from-yellow-300 to-yellow-500",
  gmail: "bg-white border border-border/40",
  whatsapp: "bg-[#25D366]",
  drive: "bg-white border border-border/40",
  asaas: "bg-[#0052CC]",
};

const TONE_FG: Partial<Record<BrandIconTone, string>> = {
  gmail: "text-[#EA4335]",
  drive: "text-[#1A73E8]",
  yellow: "text-yellow-900",
};

const SIZES = {
  xs: { box: "h-4 w-4 rounded-[5px]", icon: "h-2.5 w-2.5", stroke: 2.75 },
  sm: { box: "h-5 w-5 rounded-[6px]", icon: "h-3 w-3", stroke: 2.5 },
  md: { box: "h-6 w-6 rounded-[7px]", icon: "h-3.5 w-3.5", stroke: 2.25 },
  lg: { box: "h-8 w-8 rounded-[9px]", icon: "h-4 w-4", stroke: 2.25 },
  xl: { box: "h-10 w-10 rounded-[11px]", icon: "h-5 w-5", stroke: 2 },
} as const;

export interface BrandIconProps {
  icon: LucideIcon;
  tone: BrandIconTone;
  size?: keyof typeof SIZES;
  shape?: "square" | "circle";
  className?: string;
  iconClassName?: string;
}

export function BrandIcon({
  icon: Icon,
  tone,
  size = "sm",
  shape = "square",
  className,
  iconClassName,
}: BrandIconProps) {
  const s = SIZES[size];
  const fg = TONE_FG[tone] ?? "text-white";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0 shadow-sm",
        TONE_BG[tone],
        shape === "circle" ? "rounded-full" : s.box,
        shape === "circle" && size === "xs" && "h-4 w-4",
        shape === "circle" && size === "sm" && "h-5 w-5",
        shape === "circle" && size === "md" && "h-6 w-6",
        shape === "circle" && size === "lg" && "h-8 w-8",
        shape === "circle" && size === "xl" && "h-10 w-10",
        className,
      )}
    >
      <Icon
        className={cn(s.icon, fg, iconClassName)}
        strokeWidth={s.stroke}
      />
    </span>
  );
}
