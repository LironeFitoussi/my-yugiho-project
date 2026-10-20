import "server-only";

import { cache } from "react";

import { requireOwner } from "@/lib/auth";
import type { CardCopy } from "@/types";

import { cardIdSchema } from "./schemas";
import { queryAllCopies, queryCopiesForCard, queryRecentAcquisitions } from "./repository";

/** All copies (all pages), newest first is not required. Cached per request with React cache(). */
export const listAllCopies = cache(async (): Promise<CardCopy[]> => {
  await requireOwner();
  return queryAllCopies();
});

/** Unique owned card IDs — the basis of set completion (PRD §9). Duplicates never add. */
export async function listOwnedCardIds(): Promise<Set<number>> {
  const copies = await listAllCopies();
  return new Set(copies.map((copy) => copy.cardId));
}

export async function listCopiesForCard(cardId: number): Promise<CardCopy[]> {
  await requireOwner();
  return queryCopiesForCard(cardIdSchema.parse(cardId));
}

export async function listRecentAcquisitions(limit = 10): Promise<CardCopy[]> {
  await requireOwner();
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 10, 1), 100);
  return queryRecentAcquisitions(safeLimit);
}
