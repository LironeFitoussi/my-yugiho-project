import "server-only";

// CONTRACT STUB — owned by the Catalog agent (Wave 1 A), which replaces the bodies.
// Signatures are fixed: other features compile against them.
import type { Card, CardSet, CardSummary } from "@/types";

export type CatalogError = "not_found" | "unavailable";
export type CatalogResult<T> = { ok: true; data: T } | { ok: false; error: CatalogError };

export type CardSearchQuery = {
  /** Free text: card name, numeric card ID / passcode, or a set code like "LOB-005". */
  q: string;
  classicOnly?: boolean;
  limit?: number;
};

export async function searchCards(query: CardSearchQuery): Promise<CatalogResult<CardSummary[]>> {
  void query;
  return { ok: false, error: "unavailable" };
}

export async function getCard(id: number): Promise<CatalogResult<Card>> {
  void id;
  return { ok: false, error: "unavailable" };
}

/** Batched, cached, rate-limited. Cards the provider can't return are simply absent. */
export async function getCardsByIds(ids: number[]): Promise<Map<number, Card>> {
  void ids;
  return new Map();
}

/** Resolves a printing code ("LOB-005") to its card. */
export async function lookupBySetCode(setCode: string): Promise<CatalogResult<Card>> {
  void setCode;
  return { ok: false, error: "unavailable" };
}

export async function listSets(): Promise<CatalogResult<CardSet[]>> {
  return { ok: false, error: "unavailable" };
}

/** Set contents as unique cards. `setCode` is the CardSet.code prefix (e.g. "LOB"). */
export async function getSetCards(
  setCode: string,
): Promise<CatalogResult<{ set: CardSet; cards: CardSummary[] }>> {
  void setCode;
  return { ok: false, error: "unavailable" };
}
