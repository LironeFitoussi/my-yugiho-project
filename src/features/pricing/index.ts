// CONTRACT STUB — owned by the Pricing agent (Wave 1 D), which replaces the bodies.
import type { FxRate } from "@/lib/money";
import type { Card, CardCopy, PriceQuote } from "@/types";

/**
 * PRD §12 priority for one copy: printing-specific price (when the copy records a printing and
 * the catalog has a non-zero price for it) → general card price labelled estimate → unavailable.
 * Pure function; `card` is undefined when the catalog is unavailable.
 */
export function quoteCopy(
  copy: Pick<CardCopy, "cardId" | "printingSetCode" | "printingRarity">,
  card: Card | undefined,
  pricedAt: string,
): PriceQuote {
  void copy;
  void card;
  void pricedAt;
  return { basis: "unavailable", amount: null, pricedAt: null, source: null };
}

/** Latest USD→ILS rate (cached daily in DynamoDB), or null when none is available. Server-only. */
export async function getUsdIlsRate(): Promise<FxRate | null> {
  return null;
}
