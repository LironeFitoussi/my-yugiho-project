import "server-only";

import { cache } from "react";

import { listAllCopies } from "@/features/collection/queries";
import { getUsdIlsRate, recordPriceSnapshots } from "@/features/pricing";
import { listAllProducts } from "@/features/products/queries";
import { listAllPurchases } from "@/features/purchases/queries";
import { totalInvested } from "@/features/purchases/totals";
import type { Currency } from "@/lib/money";
import { requireOwner } from "@/lib/auth";
import { getCardsByIds } from "@/lib/ygoprodeck";

import { buildPortfolioSummary, type PortfolioSummary } from "./summary";

/**
 * Full portfolio (PRD §12): invested totals, estimated market value from the catalog, value
 * difference. Cached per request so the dashboard and portfolio page share one computation.
 * Records today's price snapshots for the valued cards; snapshot failures are logged, never fatal.
 */
export const getPortfolio = cache(async (): Promise<PortfolioSummary> => {
  await requireOwner();
  const [copies, purchases, products, fx] = await Promise.all([
    listAllCopies(),
    listAllPurchases(),
    listAllProducts(),
    getUsdIlsRate(),
  ]);
  const cardsById = copies.length ? await getCardsByIds(copies.map((c) => c.cardId)) : new Map();
  const summary = buildPortfolioSummary({ copies, cardsById, purchases, products, fx, now: new Date().toISOString() });

  if (cardsById.size > 0) {
    const uniqueCards = [...new Map([...cardsById.values()].map((card) => [card.id, card])).values()];
    try {
      await recordPriceSnapshots(uniqueCards);
    } catch (error) {
      console.error("[portfolio] recording price snapshots failed", error);
    }
  }
  return summary;
});

export type CollectionCounts = {
  uniqueCards: number;
  copies: number;
  products: number;
  invested: Record<Currency, number>;
};

/** DynamoDB-only figures (no catalog, no FX) so dashboard tiles never wait on external APIs. */
export const getCollectionCounts = cache(async (): Promise<CollectionCounts> => {
  await requireOwner();
  const [copies, purchases, products] = await Promise.all([listAllCopies(), listAllPurchases(), listAllProducts()]);
  return {
    uniqueCards: new Set(copies.map((c) => c.cardId)).size,
    copies: copies.length,
    products: products.length,
    invested: totalInvested({
      purchases,
      unlinkedCopies: copies.filter((c) => !c.purchaseId),
      unlinkedProducts: products.filter((p) => !p.purchaseId),
    }),
  };
});
