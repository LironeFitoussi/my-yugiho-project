import { cn } from "@/lib/utils";

/**
 * The app's own abstract mark: a gold triangle framing a ringed orb, with a
 * small diamond above. Original geometry — not derived from any official artwork.
 * Colour comes from `currentColor` (default: the gold token).
 */
export function Emblem({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      className={cn("text-gold", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M24 5 L43 39 H5 Z" strokeWidth="2.5" />
      <path d="M24 13 L36 35 H12 Z" strokeWidth="1" opacity="0.55" />
      <circle cx="24" cy="27" r="6" strokeWidth="2" />
      <circle cx="24" cy="27" r="2.25" fill="currentColor" stroke="none" />
      <path d="M24 0.5 L26 3 L24 5.5 L22 3 Z" fill="currentColor" stroke="none" />
      <path d="M2 43.5 H46" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}
