import "server-only";

import { listOwnedCardIds } from "@/features/collection/queries";
import { requireOwner } from "@/lib/auth";
import { getSetCards, listSets, type CatalogError } from "@/lib/ygoprodeck";
import type { CardSet, CardSummary } from "@/types";

import { computeCompletion, type SetCompletion } from "./completion";

/** Max sets per list request that get a completion figure (each needs a set-cards fetch). */
export const COMPLETION_LIMIT = 12;
/** Max sets rendered per list request; users narrow further with search / classic filter. */
export const DISPLAY_LIMIT = 60;

export type SetCompletionResult =
  | { ok: true; set: CardSet; cards: CardSummary[]; completion: SetCompletion }
  | { ok: false; error: CatalogError };

export async function getSetCompletion(code: string): Promise<SetCompletionResult> {
  await requireOwner();
  const [result, owned] = await Promise.all([getSetCards(code), listOwnedCardIds()]);
  if (!result.ok) return result;
  const { set, cards } = result.data;
  return { ok: true, set, cards, completion: computeCompletion(cards.map((c) => c.id), owned) };
}

export type SetListEntry = { set: CardSet; completion: SetCompletion | null };

export type SetListResult =
  | { ok: true; sets: SetListEntry[]; totalMatches: number; completionComputed: boolean }
  | { ok: false; error: CatalogError };

/**
 * Lists set metadata (newest first, at most DISPLAY_LIMIT). Completion is computed only for the
 * first COMPLETION_LIMIT displayed sets, and only when the list is narrowed (search or classic-only):
 * computing it for every set would need hundreds of catalog calls. Fetches run sequentially to
 * respect the catalog rate limit; getSetCards caches results.
 */
export async function listSetsWithCompletion({
  q,
  classicOnly,
}: {
  q: string;
  classicOnly: boolean;
}): Promise<SetListResult> {
  await requireOwner();
  const result = await listSets();
  if (!result.ok) return result;

  const needle = q.trim().toLowerCase();
  const matches = result.data
    .filter((s) => !classicOnly || s.isClassic)
    .filter((s) => !needle || s.name.toLowerCase().includes(needle) || s.code.toLowerCase().includes(needle))
    .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || a.name.localeCompare(b.name));

  const completionComputed = needle !== "" || classicOnly;
  const owned = completionComputed ? await listOwnedCardIds() : new Set<number>();

  const sets: SetListEntry[] = [];
  for (const [index, set] of matches.slice(0, DISPLAY_LIMIT).entries()) {
    let completion: SetCompletion | null = null;
    if (completionComputed && index < COMPLETION_LIMIT) {
      const cards = await getSetCards(set.code);
      if (cards.ok) completion = computeCompletion(cards.data.cards.map((c) => c.id), owned);
    }
    sets.push({ set, completion });
  }
  return { ok: true, sets, totalMatches: matches.length, completionComputed };
}
