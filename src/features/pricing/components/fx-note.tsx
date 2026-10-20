import { cn } from "cn";

import type { FxRate } from "@/lib/money";

/** Deterministic (hydration-safe) timestamp: "YYYY-MM-DD HH:MM UTC". */
function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** "1 USD = X ILS · ECB rate of <rateDate>, fetched <time>", or a notice when no rate exists. */
export function FxNote({ rate, className }: { rate: FxRate | null; className?: string }) {
  if (!rate) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Exchange rate unavailable — amounts are shown in their original currency only.
      </p>
    );
  }
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      1 {rate.base} = {rate.rate} {rate.quote} · ECB rate of {rate.rateDate}, fetched{" "}
      <time dateTime={rate.fetchedAt}>{formatFetchedAt(rate.fetchedAt)}</time>
    </p>
  );
}
