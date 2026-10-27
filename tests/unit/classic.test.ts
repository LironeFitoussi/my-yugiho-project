import { describe, expect, it } from "vitest";

import {
  CLASSIC_CARDS_RULE,
  CLASSIC_CARD_IDS,
  CLASSIC_RULE,
  CLASSIC_TOTAL,
  canonicalCardId,
  isClassicCard,
  isClassicSet,
  setCodePrefix,
} from "@/features/catalog/classic";
import classicCards from "@/features/catalog/data/classic-cards.json";
import classicSets from "@/features/catalog/data/classic-sets.json";

describe("classic set dataset", () => {
  it("is versioned, documents its rule and has unique upper-case codes", () => {
    expect(classicSets.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(CLASSIC_RULE.length).toBeGreaterThan(50);
    expect(new Set(classicSets.setCodes).size).toBe(classicSets.setCodes.length);
    for (const code of classicSets.setCodes) expect(code).toMatch(/^[A-Z0-9]+$/);
  });
});

describe("classic card dataset", () => {
  it("is versioned and documents its rule", () => {
    expect(classicCards.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(CLASSIC_CARDS_RULE.length).toBeGreaterThan(50);
  });

  it("holds the 1416 verified cards (866 monsters, 328 spells, 222 traps), each identity once", () => {
    expect(CLASSIC_TOTAL).toBe(1416);
    expect(new Set(CLASSIC_CARD_IDS).size).toBe(CLASSIC_CARD_IDS.length);
    const all = [...classicCards.cards, ...classicCards.unlinked];
    const count = (type: string) => all.filter((c) => c.type === type).length;
    expect([count("Monster"), count("Spell"), count("Trap")]).toEqual([866, 328, 222]);
    expect(new Set(all.map((c) => c.name)).size).toBe(all.length);
  });

  it("maps alternate-art passwords to a canonical id that is in the pool, never to another alias", () => {
    const ids = new Set(CLASSIC_CARD_IDS);
    for (const [alt, canonical] of Object.entries(classicCards.aliases)) {
      expect(ids.has(Number(alt))).toBe(false);
      expect(ids.has(canonical)).toBe(true);
    }
  });
});

describe("isClassicSet", () => {
  it("matches set prefixes, printing codes and disambiguated set ids", () => {
    expect(setCodePrefix("LOB-EN005")).toBe("LOB");
    expect(isClassicSet("LOB")).toBe(true);
    expect(isClassicSet("lob-005")).toBe(true);
    expect(isClassicSet("IOC_2")).toBe(true);
    expect(isClassicSet("MRD-EN001")).toBe(true);
    expect(isClassicSet("SOD-EN001")).toBe(false); // released after the 2004-09-29 cutoff
    expect(isClassicSet("EGO1-EN001")).toBe(false); // modern reprint deck
    expect(isClassicSet("CT13-EN003")).toBe(false);
    expect(isClassicSet("")).toBe(false);
  });
});

describe("isClassicCard", () => {
  it("is true only for cards in the curated pool, including their alternate artworks", () => {
    expect(isClassicCard({ id: 89631139 })).toBe(true); // Blue-Eyes White Dragon
    expect(isClassicCard({ id: 45231178 })).toBe(true); // Flame Swordsman alternate art
    expect(canonicalCardId(45231178)).toBe(45231177);
    expect(canonicalCardId(89631139)).toBe(89631139);
    expect(isClassicCard({ id: 1 })).toBe(false);
  });
});
