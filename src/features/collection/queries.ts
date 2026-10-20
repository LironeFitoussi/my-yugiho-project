import "server-only";

// CONTRACT STUB — owned by the Collection agent (Wave 1 B), which replaces the bodies.
// Every function must call requireOwner() itself.
import type { CardCopy } from "@/types";

/** All copies (all pages), newest first is not required. Cached per request with React cache(). */
export async function listAllCopies(): Promise<CardCopy[]> {
  return [];
}

/** Unique owned card IDs — the basis of set completion (PRD §9). */
export async function listOwnedCardIds(): Promise<Set<number>> {
  return new Set();
}

export async function listCopiesForCard(cardId: number): Promise<CardCopy[]> {
  void cardId;
  return [];
}

export async function listRecentAcquisitions(limit = 10): Promise<CardCopy[]> {
  void limit;
  return [];
}
