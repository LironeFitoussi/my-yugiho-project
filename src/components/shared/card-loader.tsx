import { cn } from "@/lib/utils";

import { Emblem } from "./emblem";

const SIZES = {
  sm: { card: "w-10", emblem: "size-5" },
  md: { card: "w-16", emblem: "size-8" },
  lg: { card: "w-24", emblem: "size-12" },
} as const;

/** One face of the original card back: violet field, gold inner frame, centred emblem. */
function CardFace({ emblem, back = false }: { emblem: string; back?: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-0 grid place-items-center overflow-hidden rounded-[10%/7%] border border-gold/70 backface-hidden",
        "bg-[radial-gradient(circle_at_50%_45%,oklch(0.42_0.17_300),oklch(0.22_0.08_290)_60%,oklch(0.14_0.04_285))]",
        back && "rotate-y-180",
      )}
    >
      <div className="absolute inset-[7%] rounded-[8%/5.5%] border border-gold/60" />
      <div className="absolute inset-[13%] rounded-full border border-gold/25" />
      <Emblem className={cn(emblem, "drop-shadow-[0_0_6px_oklch(0.82_0.14_85/0.6)]")} />
    </div>
  );
}

/**
 * Loading indicator: an original card back flipping on its Y axis with a soft
 * pulsing glow. CSS-only; freezes face-up under prefers-reduced-motion.
 */
export function CardLoader({
  size = "md",
  caption,
  label = "Loading",
  className,
}: {
  size?: keyof typeof SIZES;
  caption?: string;
  label?: string;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div role="status" className={cn("flex flex-col items-center gap-3", className)}>
      <div className={cn("relative aspect-[59/86] perspective-[600px]", s.card)} aria-hidden>
        <div className="absolute -inset-1/3 animate-glow-pulse rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.14_85/0.45),oklch(0.55_0.2_300/0.25)_55%,transparent)] blur-md" />
        <div className="relative size-full animate-card-spin transform-3d">
          <CardFace emblem={s.emblem} />
          <CardFace emblem={s.emblem} back />
        </div>
      </div>
      {caption ? (
        <p className="font-display text-xs tracking-[0.2em] text-gold/90 uppercase" aria-hidden>
          {caption}
        </p>
      ) : null}
      <span className="sr-only">{caption ?? label}</span>
    </div>
  );
}
