// Classic Duel Monsters filter (PRD §7): curated, versioned datasets — never inferred from API fields.
// classic-cards.json is the exact target card pool; classic-sets.json only drives set-level badges/filters.
import classicCards from "./data/classic-cards.json";
import classicSets from "./data/classic-sets.json";

export const CLASSIC_SETS_VERSION: string = classicSets.version;
export const CLASSIC_RULE: string = classicSets.rule;
export const CLASSIC_CARDS_VERSION: string = classicCards.version;
export const CLASSIC_CARDS_RULE: string = classicCards.rule;

const CLASSIC_CODES: ReadonlySet<string> = new Set(classicSets.setCodes.map((c) => c.toUpperCase()));

/** Canonical ids of the target pool that a catalog card can be matched against. */
export const CLASSIC_CARD_IDS: readonly number[] = classicCards.cards.map((c) => c.id);
const CLASSIC_IDS: ReadonlySet<number> = new Set(CLASSIC_CARD_IDS);
const ALIASES: ReadonlyMap<number, number> = new Map(
  Object.entries(classicCards.aliases).map(([alt, canonical]) => [Number(alt), canonical]),
);

/** Target cards with no passcode: counted in the total, but no catalog id can match them yet. */
export const CLASSIC_UNLINKED: ReadonlyArray<{ name: string; firstSetCode: string }> = classicCards.unlinked;

/** Size of the target pool, linked and unlinked. */
export const CLASSIC_TOTAL: number = CLASSIC_CARD_IDS.length + CLASSIC_UNLINKED.length;

/** Alternate-art passwords resolve to their canonical card id; every other id is returned as is. */
export function canonicalCardId(id: number): number {
  return ALIASES.get(id) ?? id;
}

/**
 * Set-code prefix of a printing or set id: "LOB-EN005" → "LOB", "LOB-005" → "LOB",
 * "IOC_2" (a disambiguated CardSet.code) → "IOC".
 */
export function setCodePrefix(code: string): string {
  return code.trim().toUpperCase().split(/[-_]/)[0] ?? "";
}

/** True when the set (CardSet.code or a raw set code) is in the curated classic list. */
export function isClassicSet(code: string): boolean {
  return CLASSIC_CODES.has(setCodePrefix(code));
}

/** True when the card (or an alternate-art password of it) is in the curated target pool. */
export function isClassicCard(card: { id: number }): boolean {
  return CLASSIC_IDS.has(canonicalCardId(card.id));
}
