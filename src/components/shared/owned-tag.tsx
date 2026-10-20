import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Gold "Owned" pill overlaid on card art. `count` = physical copies owned
 * (shows "×N" when > 1); omit it when only ownership (not quantity) is known.
 * Pass `decorative` when the surrounding markup already announces ownership.
 */
export function OwnedTag({
  count,
  decorative = false,
  className,
}: {
  count?: number;
  decorative?: boolean;
  className?: string;
}) {
  const label =
    count === undefined ? "Owned" : `Owned: ${count} ${count === 1 ? "copy" : "copies"}`;
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      title={label}
      className={cn(
        "inline-flex h-5 items-center gap-0.5 rounded-full border border-gold/70 bg-black/70 px-1.5 text-[10px] leading-none font-semibold text-gold shadow-[0_0_8px] shadow-gold/40 backdrop-blur-sm",
        className,
      )}
    >
      <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden />
      Owned
      {count !== undefined && count > 1 ? <span className="tabular-nums">×{count}</span> : null}
    </span>
  );
}
