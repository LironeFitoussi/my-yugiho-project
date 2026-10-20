// Pure, client-safe PRD §12 pricing priority. No server-only imports here.
import type { Card, CardCopy, CardPrinting, CatalogPrice, PriceQuote } from "@/types";

const norm = (s: string) => s.trim().toUpperCase();

/** A usable catalog price: present and strictly positive (zero is treated as missing). */
function usable(price: CatalogPrice | null): price is CatalogPrice {
  return price !== null && Number.isSafeInteger(price.amountMinor) && price.amountMinor > 0;
}

/**
 * Finds the printing-specific price for a copy, or null when it cannot be determined reliably:
 * no printing recorded, no matching printing, ambiguous printings that disagree on price,
 * or a missing/zero price.
 */
function printingPrice(
  copy: Pick<CardCopy, "printingSetCode" | "printingRarity">,
  printings: CardPrinting[],
): CatalogPrice | null {
  if (!copy.printingSetCode) return null;
  const code = norm(copy.printingSetCode);
  let candidates = printings.filter((p) => norm(p.setCode) === code);
  if (copy.printingRarity) {
    const rarity = norm(copy.printingRarity);
    candidates = candidates.filter(
      (p) => norm(p.rarity) === rarity || (p.rarityCode !== null && norm(p.rarityCode) === rarity),
    );
  }
  if (candidates.length === 0) return null;
  const first = candidates[0].price;
  if (!usable(first)) return null;
  // Several candidates (same code, rarity unknown or duplicated): only trust a price they all agree on.
  const allAgree = candidates.every(
    (p) => usable(p.price) && p.price.amountMinor === first.amountMinor && p.price.currency === first.currency,
  );
  return allAgree ? first : null;
}

/**
 * PRD §12 priority for one copy: printing-specific price (when the copy records a printing and
 * the catalog has a non-zero price for it) → general card price labelled estimate → unavailable.
 * Never invents a price and applies no condition multipliers.
 * `card` is undefined when the catalog is unavailable (→ unavailable, pricedAt null).
 */
export function quoteCopy(
  copy: Pick<CardCopy, "cardId" | "printingSetCode" | "printingRarity">,
  card: Card | undefined,
  pricedAt: string,
): PriceQuote {
  if (!card) return { basis: "unavailable", amount: null, pricedAt: null, source: null };

  const printing = printingPrice(copy, card.printings);
  if (printing) {
    return {
      basis: "printing",
      amount: { amountMinor: printing.amountMinor, currency: printing.currency },
      pricedAt,
      source: printing.source,
    };
  }
  if (usable(card.marketPrice)) {
    return {
      basis: "card-estimate",
      amount: { amountMinor: card.marketPrice.amountMinor, currency: card.marketPrice.currency },
      pricedAt,
      source: card.marketPrice.source,
    };
  }
  return { basis: "unavailable", amount: null, pricedAt, source: null };
}
