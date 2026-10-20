import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";

import { listOwnedCardIds } from "@/features/collection/queries";
import { computeCompletion } from "@/features/sets/completion";
import { getSetCards, listSets } from "@/lib/ygoprodeck";
import { CATALOG_TAG } from "@/lib/ygoprodeck/cached";

export type ClassicProgress =
  | {
      ok: true;
      owned: number;
      total: number;
      percent: number;
      setCount: number;
      catalogAsOf: string;
    }
  | { ok: false };

/**
 * Unique card ids across every curated classic set (PRD §7, §9). Catalog-only data, so it is
 * computed once and cached for a day. Sets are fetched sequentially to respect the provider's
 * rate limit. Any unavailable set throws, so a partial (wrong) total is never cached.
 */
async function classicCatalogCardIds(): Promise<{ ids: number[]; setCount: number; asOf: string }> {
  "use cache";
  cacheTag(CATALOG_TAG, `${CATALOG_TAG}:classic-progress`);
  cacheLife("days");

  const sets = await listSets();
  if (!sets.ok) throw new Error("Catalog unavailable: set list");
  const classic = sets.data.filter((s) => s.isClassic);

  const ids = new Set<number>();
  for (const set of classic) {
    const result = await getSetCards(set.code);
    if (!result.ok) {
      if (result.error === "not_found") continue;
      throw new Error(`Catalog unavailable: set ${set.code}`);
    }
    for (const card of result.data.cards) ids.add(card.id);
  }
  return { ids: [...ids], setCount: classic.length, asOf: new Date().toISOString() };
}

/** "You own X of Y classic cards": unique identities, any printing counts, duplicates count once. */
export const getClassicProgress = cache(async (): Promise<ClassicProgress> => {
  // listOwnedCardIds() performs requireOwner().
  const owned = await listOwnedCardIds();
  try {
    const catalog = await classicCatalogCardIds();
    const completion = computeCompletion(catalog.ids, owned);
    return {
      ok: true,
      owned: completion.owned,
      total: completion.total,
      percent: completion.percent,
      setCount: catalog.setCount,
      catalogAsOf: catalog.asOf,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[progress]", error instanceof Error ? error.message : error);
    return { ok: false };
  }
});
