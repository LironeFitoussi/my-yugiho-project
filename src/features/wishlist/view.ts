// Pure wishlist view logic (PRD §13): ownership status, estimated prices, filtering.
import { quoteCopy } from "@/features/pricing/quote";
import type { Card, CardCopy, PriceQuote, Product, WishlistItem } from "@/types";

import type { WishlistFilters } from "./schemas";

export type CardWishEntry = {
  kind: "CARD";
  item: Extract<WishlistItem, { kind: "CARD" }>;
  ownedCount: number;
  /** Owned when the user has at least as many copies as they want. */
  status: "wanted" | "owned";
  /** General card price (no printing → card estimate or unavailable). Null when not priced at all. */
  quote: PriceQuote | null;
  imageUrlSmall: string | null;
};

export type ProductWishEntry = {
  kind: "PRODUCT";
  item: Extract<WishlistItem, { kind: "PRODUCT" }>;
  /** Owned only via the explicit fulfilledByProductId link — never auto-matched. */
  status: "wanted" | "owned";
  fulfilledBy: Pick<Product, "productId" | "name"> | null;
};

export type WishlistEntry = CardWishEntry | ProductWishEntry;

export function ownedCountsByCard(copies: Pick<CardCopy, "cardId">[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const c of copies) counts.set(c.cardId, (counts.get(c.cardId) ?? 0) + 1);
  return counts;
}

export function buildWishlistEntries({
  items,
  ownedCounts,
  cardsById,
  products,
  pricedAt,
}: {
  items: WishlistItem[];
  ownedCounts: Map<number, number>;
  /** Omit to skip pricing (e.g. summaries that must not wait for the catalog). */
  cardsById?: Map<number, Card>;
  products: Pick<Product, "productId" | "name">[];
  pricedAt: string;
}): WishlistEntry[] {
  const productsById = new Map(products.map((p) => [p.productId, p]));
  const entries = items.map((item): WishlistEntry => {
    if (item.kind === "CARD") {
      const ownedCount = ownedCounts.get(item.cardId) ?? 0;
      const card = cardsById?.get(item.cardId);
      return {
        kind: "CARD",
        item,
        ownedCount,
        status: ownedCount >= item.desiredQuantity ? "owned" : "wanted",
        quote: cardsById
          ? quoteCopy({ cardId: item.cardId, printingSetCode: null, printingRarity: null }, card, pricedAt)
          : null,
        imageUrlSmall: card?.imageUrlSmall ?? null,
      };
    }
    // A link to a product that was since deleted no longer counts as owned.
    const fulfilledBy = item.fulfilledByProductId ? (productsById.get(item.fulfilledByProductId) ?? null) : null;
    return { kind: "PRODUCT", item, status: fulfilledBy ? "owned" : "wanted", fulfilledBy };
  });
  return entries.sort((a, b) => b.item.createdAt.localeCompare(a.item.createdAt));
}

const entryName = (e: WishlistEntry) => (e.kind === "CARD" ? e.item.cardName : e.item.name);

export function filterWishlist(entries: WishlistEntry[], filters: WishlistFilters): WishlistEntry[] {
  const needle = filters.q.toLowerCase();
  return entries.filter((e) => {
    if (filters.kind === "card" && e.kind !== "CARD") return false;
    if (filters.kind === "product" && e.kind !== "PRODUCT") return false;
    if (filters.status !== "all" && e.status !== filters.status) return false;
    if (!needle) return true;
    const haystack = [entryName(e), e.item.notes, e.kind === "PRODUCT" ? (e.item.setCode ?? "") : String(e.item.cardId)]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export type WishlistCounts = { total: number; wanted: number; owned: number; cards: number; products: number };

export function countWishlist(entries: WishlistEntry[]): WishlistCounts {
  let wanted = 0;
  let cards = 0;
  for (const e of entries) {
    if (e.status === "wanted") wanted += 1;
    if (e.kind === "CARD") cards += 1;
  }
  return { total: entries.length, wanted, owned: entries.length - wanted, cards, products: entries.length - cards };
}
