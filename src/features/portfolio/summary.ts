// Pure portfolio math (PRD §12, §14). Integer minor units only; USD and ILS are never summed
// directly — a cross-currency figure exists only when an exchange rate does, and carries it.
import { valuationInCurrency, valueCopies } from "@/features/pricing/valuation";
import { totalInvested } from "@/features/purchases/totals";
import { addMoney, convert, CURRENCIES, type Currency, type FxRate, type Money, subtractMoney } from "@/lib/money";
import type { Card, CardCopy, Product, Purchase } from "@/types";

/** Money that may be negative (value differences). */
export type SignedMoney = { amountMinor: number; currency: Currency };

export type UnpricedCard = { cardId: number; cardName: string; copies: number };

export type MarketSummary = {
  /** Sum of priced copies (printing + card estimate), USD. Unpriced copies are excluded. */
  totalUsd: Money;
  /** totalUsd converted with `fx`; null when no rate is available. */
  totalIls: Money | null;
  pricedCopies: number;
  /** Priced from the printing-specific price. */
  printingCopies: number;
  /** Priced from the general card price — labelled Estimated. */
  estimatedCopies: number;
  unpricedCopies: number;
  /** Unique cards with at least one unpriced copy. */
  unpricedCards: UnpricedCard[];
};

export type PortfolioSummary = {
  valuedAt: string;
  counts: { uniqueCards: number; copies: number; products: number; sealedProducts: number; purchases: number };
  /** Total invested per original currency (purchases + unlinked copies/products, never double counted). */
  invested: Record<Currency, number>;
  /** Everything invested expressed in one currency; null when that needs a rate and none exists. */
  investedIn: Record<Currency, Money | null>;
  fx: FxRate | null;
  /** Null when the catalog was unavailable for every owned card. */
  market: MarketSummary | null;
  /** Estimated market value − total invested, per display currency (each computed on its own). */
  difference: Record<Currency, SignedMoney | null>;
};

function investedInCurrency(invested: Record<Currency, number>, to: Currency, fx: FxRate | null): Money | null {
  let total: Money = { amountMinor: invested[to], currency: to };
  for (const from of CURRENCIES) {
    if (from === to || invested[from] === 0) continue;
    if (!fx) return null;
    total = addMoney(total, convert({ amountMinor: invested[from], currency: from }, to, fx));
  }
  return total;
}

export function buildPortfolioSummary({
  copies,
  cardsById,
  purchases,
  products,
  fx,
  now,
}: {
  copies: CardCopy[];
  /** Partial map from the catalog; missing cards are unpriced. */
  cardsById: Map<number, Card>;
  purchases: Pick<Purchase, "currency" | "subtotalMinor" | "shippingMinor">[];
  products: Pick<Product, "price" | "shipping" | "purchaseId" | "status">[];
  fx: FxRate | null;
  now: string;
}): PortfolioSummary {
  const uniqueCardIds = new Set(copies.map((c) => c.cardId));

  const invested = totalInvested({
    purchases,
    unlinkedCopies: copies.filter((c) => !c.purchaseId),
    unlinkedProducts: products.filter((p) => !p.purchaseId),
  });
  const investedIn: Record<Currency, Money | null> = {
    USD: investedInCurrency(invested, "USD", fx),
    ILS: investedInCurrency(invested, "ILS", fx),
  };

  const catalogAvailable = uniqueCardIds.size === 0 || cardsById.size > 0;
  let market: MarketSummary | null = null;
  if (catalogAvailable) {
    const valuation = valueCopies(copies, cardsById, now);
    const totalUsd: Money = { amountMinor: valuation.totalUsdMinor, currency: "USD" };
    const unpricedById = new Map<number, UnpricedCard>();
    for (const copy of valuation.unpriced) {
      const entry = unpricedById.get(copy.cardId) ?? { cardId: copy.cardId, cardName: copy.cardName, copies: 0 };
      entry.copies += 1;
      unpricedById.set(copy.cardId, entry);
    }
    market = {
      totalUsd,
      totalIls: valuationInCurrency(totalUsd, fx, "ILS").amount,
      pricedCopies: valuation.pricedCount,
      printingCopies: valuation.pricedCount - valuation.estimatedCount,
      estimatedCopies: valuation.estimatedCount,
      unpricedCopies: valuation.unpriced.length,
      unpricedCards: [...unpricedById.values()].sort((a, b) => a.cardName.localeCompare(b.cardName)),
    };
  }

  const marketIn: Record<Currency, Money | null> = { USD: market?.totalUsd ?? null, ILS: market?.totalIls ?? null };
  const difference = {} as Record<Currency, SignedMoney | null>;
  for (const c of CURRENCIES) {
    const value = marketIn[c];
    const cost = investedIn[c];
    difference[c] = value && cost ? subtractMoney(value, cost) : null;
  }

  return {
    valuedAt: now,
    counts: {
      uniqueCards: uniqueCardIds.size,
      copies: copies.length,
      products: products.length,
      sealedProducts: products.filter((p) => p.status === "sealed").length,
      purchases: purchases.length,
    },
    invested,
    investedIn,
    fx,
    market,
    difference,
  };
}
