import "server-only";

import { cache } from "react";

import type { Page } from "@/lib/aws/pagination";
import { requireOwner } from "@/lib/auth";
import type { Purchase } from "@/types";

import {
  type PurchaseWithItems,
  queryAllPurchases,
  queryPurchasesPage,
  queryPurchaseWithItems,
} from "./repository";
import { idSchema } from "./schemas";

export type { PurchaseItemView, PurchaseWithItems } from "./repository";

/** One page of purchases, newest date first. */
export async function listPurchases(cursor?: string | null): Promise<Page<Purchase>> {
  await requireOwner();
  return queryPurchasesPage(cursor);
}

/** Every purchase (all pages). Cached per request. */
export const listAllPurchases = cache(async (): Promise<Purchase[]> => {
  await requireOwner();
  return queryAllPurchases();
});

/** One purchase with its items, or null when the id is invalid or unknown. */
export async function getPurchaseWithItems(purchaseId: string): Promise<PurchaseWithItems | null> {
  await requireOwner();
  const parsed = idSchema.safeParse(purchaseId);
  if (!parsed.success) return null;
  return queryPurchaseWithItems(parsed.data);
}

export async function listRecentPurchases(limit = 5): Promise<Purchase[]> {
  await requireOwner();
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 1, 1), 100);
  return (await queryPurchasesPage(null, safeLimit)).items;
}
