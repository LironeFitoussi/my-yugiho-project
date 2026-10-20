// Classic Duel Monsters filter (PRD §7): a curated, versioned dataset — never inferred from API fields.
import classicSets from "./data/classic-sets.json";

export const CLASSIC_SETS_VERSION: string = classicSets.version;
export const CLASSIC_RULE: string = classicSets.rule;

const CLASSIC_CODES: ReadonlySet<string> = new Set(classicSets.setCodes.map((c) => c.toUpperCase()));

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

/** True when any printing of the card belongs to a classic set. */
export function isClassicCard(card: { printings: ReadonlyArray<{ setCode: string }> }): boolean {
  return card.printings.some((p) => isClassicSet(p.setCode));
}
