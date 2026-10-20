import "server-only";

import { cache } from "react";

import { listAllCopies } from "@/features/collection/queries";
import { listAllProducts } from "@/features/products/queries";
import { requireOwner } from "@/lib/auth";
import { getCardsByIds } from "@/lib/ygoprodeck";
import type { WishlistItem } from "@/types";

import { getCardWishRecord, queryWishlist } from "./repository";
import { wishCardIdSchema, type WishlistFilters } from "./schemas";
import {
  buildWishlistEntries,
  countWishlist,
  filterWishlist,
  ownedCountsByCard,
  type WishlistCounts,
  type WishlistEntry,
} from "./view";

/** Every wishlist item. Cached per request. */
export const listWishlist = cache(async (): Promise<WishlistItem[]> => {
  await requireOwner();
  return queryWishlist();
});

/** The wishlist entry for one card, or null (used by the card page's wishlist button). */
export async function getCardWish(cardId: number) {
  await requireOwner();
  const parsed = wishCardIdSchema.safeParse(cardId);
  if (!parsed.success) return null;
  return getCardWishRecord(parsed.data);
}

export type WishlistView = { entries: WishlistEntry[]; counts: WishlistCounts; pricedAt: string; catalogUnavailable: boolean };

/**
 * Wishlist with ownership status and estimated card prices, filtered. Counts cover the whole
 * (unfiltered) wishlist. Cards the catalog can't return show Price Unavailable.
 */
export async function getWishlistView(filters: WishlistFilters): Promise<WishlistView> {
  await requireOwner();
  const [items, copies, products] = await Promise.all([listWishlist(), listAllCopies(), listAllProducts()]);
  const cardIds = items.flatMap((i) => (i.kind === "CARD" ? [i.cardId] : []));
  const cardsById = cardIds.length ? await getCardsByIds(cardIds) : new Map();
  const pricedAt = new Date().toISOString();
  const entries = buildWishlistEntries({ items, ownedCounts: ownedCountsByCard(copies), cardsById, products, pricedAt });
  return {
    entries: filterWishlist(entries, filters),
    counts: countWishlist(entries),
    pricedAt,
    catalogUnavailable: cardIds.length > 0 && cardsById.size === 0,
  };
}

/** Wanted/owned counts without touching the catalog (dashboard). */
export async function getWishlistCounts(): Promise<WishlistCounts> {
  await requireOwner();
  const [items, copies, products] = await Promise.all([listWishlist(), listAllCopies(), listAllProducts()]);
  return countWishlist(
    buildWishlistEntries({ items, ownedCounts: ownedCountsByCard(copies), products, pricedAt: new Date().toISOString() }),
  );
}
