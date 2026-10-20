import { cn } from "@/lib/utils";

const ATTRIBUTE_STYLES: Record<string, string> = {
  DARK: "border-purple-400/50 bg-purple-950/70 text-purple-200",
  LIGHT: "border-amber-200/60 bg-amber-100/15 text-amber-100",
  FIRE: "border-red-400/50 bg-red-950/70 text-red-200",
  WATER: "border-sky-400/50 bg-sky-950/70 text-sky-200",
  EARTH: "border-amber-700/60 bg-amber-950/70 text-amber-200",
  WIND: "border-emerald-400/50 bg-emerald-950/70 text-emerald-200",
  DIVINE: "border-yellow-200/70 bg-linear-to-r from-yellow-200/25 to-white/15 text-yellow-50",
};

/** Small coloured chip for a monster attribute (DARK, LIGHT, …). Renders nothing when absent. */
export function AttributeBadge({ attribute, className }: { attribute: string | null | undefined; className?: string }) {
  if (!attribute) return null;
  const key = attribute.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold tracking-wider uppercase",
        ATTRIBUTE_STYLES[key] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
      title={`Attribute: ${key}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {key}
    </span>
  );
}
