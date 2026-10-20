// Pure, client-safe collection valuation (PRD §12). No server-only imports here.
import { convert, type Currency, type FxRate, type Money } from "@/lib/money";
import type { Card, CardCopy, PriceQuote } from "@/types";

import { quoteCopy } from "./quote";

/**
 * Sealed products are deliberately NOT valued: there is no reliable sealed-product price source,
 * and their contents are not owned cards until the user adds copies manually (PRD §10, §12).
 * Valuing them would either invent a price or double-count cards from opened products.
 */
export const SEALED_PRODUCTS_VALUATION_NOTE =
  "Sealed products are not included in the estimated market value — no reliable price data is available for them, and their cards count only once added to the collection as copies.";

export type CollectionValuation = {
  quotes: Map<string, PriceQuote>;
  /** Sum of priced copies only (printing + card-estimate), USD minor units. */
  totalUsdMinor: number;
  /** Copies with any usable price. */
  pricedCount: number;
  /** Subset of pricedCount valued from the general card price (labelled Estimated). */
  estimatedCount: number;
  /** Copies with no usable price — excluded from the total. */
  unpriced: CardCopy[];
};

export function valueCopies(
  copies: CardCopy[],
  cardsById: Map<number, Card>,
  pricedAt: string,
): CollectionValuation {
  const quotes = new Map<string, PriceQuote>();
  const unpriced: CardCopy[] = [];
  let totalUsdMinor = 0;
  let pricedCount = 0;
  let estimatedCount = 0;

  for (const copy of copies) {
    const quote = quoteCopy(copy, cardsById.get(copy.cardId), pricedAt);
    quotes.set(copy.copyId, quote);
    if (quote.basis === "unavailable") {
      unpriced.push(copy);
      continue;
    }
    // Catalog prices are USD; never sum mixed currencies.
    if (quote.amount.currency !== "USD") throw new Error(`Unexpected catalog currency ${quote.amount.currency}`);
    totalUsdMinor += quote.amount.amountMinor;
    pricedCount += 1;
    if (quote.basis === "card-estimate") estimatedCount += 1;
  }

  return { quotes, totalUsdMinor, pricedCount, estimatedCount, unpriced };
}

/**
 * Expresses a USD total in `to`. Returns amount null when a conversion is needed but no rate is
 * available — never invents a rate. The rate is returned so the UI can show its timestamp.
 */
export function valuationInCurrency(
  totalUsd: Money,
  fx: FxRate | null,
  to: Currency,
): { amount: Money | null; rate: FxRate | null } {
  if (totalUsd.currency === to) return { amount: totalUsd, rate: null };
  if (!fx) return { amount: null, rate: null };
  return { amount: convert(totalUsd, to, fx), rate: fx };
}
