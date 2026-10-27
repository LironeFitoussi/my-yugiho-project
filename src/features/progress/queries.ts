import "server-only";

import { cache } from "react";

import { CLASSIC_CARD_IDS, CLASSIC_CARDS_VERSION, CLASSIC_TOTAL, CLASSIC_UNLINKED, canonicalCardId } from "@/features/catalog/classic";
import { listOwnedCardIds } from "@/features/collection/queries";
import { computeCompletion } from "@/features/sets/completion";

export type ClassicProgress = {
  owned: number;
  total: number;
  percent: number;
  /** Target cards with no catalog id: always counted as missing. */
  unlinked: number;
  listVersion: string;
};

/**
 * "You own X of Y classic cards" against the curated target pool (PRD §7, §9): unique identities,
 * any printing counts, duplicates count once, alternate-art passwords resolve to their card.
 * The pool is a static dataset, so no catalog call is needed and the total never depends on the provider.
 */
export const getClassicProgress = cache(async (): Promise<ClassicProgress> => {
  // listOwnedCardIds() performs requireOwner().
  const owned = new Set([...(await listOwnedCardIds())].map(canonicalCardId));
  const completion = computeCompletion([...CLASSIC_CARD_IDS], owned);
  const percent = Math.floor((completion.owned * 1000) / CLASSIC_TOTAL) / 10;
  return {
    owned: completion.owned,
    total: CLASSIC_TOTAL,
    percent,
    unlinked: CLASSIC_UNLINKED.length,
    listVersion: CLASSIC_CARDS_VERSION,
  };
});
