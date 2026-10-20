import { describe, expect, it } from "vitest";

import { CLASSIC_RULE, isClassicCard, isClassicSet, setCodePrefix } from "@/features/catalog/classic";
import classicSets from "@/features/catalog/data/classic-sets.json";

describe("classic dataset", () => {
  it("is versioned, documents its rule and has unique upper-case codes", () => {
    expect(classicSets.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(CLASSIC_RULE.length).toBeGreaterThan(50);
    expect(new Set(classicSets.setCodes).size).toBe(classicSets.setCodes.length);
    for (const code of classicSets.setCodes) expect(code).toMatch(/^[A-Z0-9]+$/);
  });
});

describe("isClassicSet", () => {
  it("matches set prefixes, printing codes and disambiguated set ids", () => {
    expect(setCodePrefix("LOB-EN005")).toBe("LOB");
    expect(isClassicSet("LOB")).toBe(true);
    expect(isClassicSet("lob-005")).toBe(true);
    expect(isClassicSet("IOC_2")).toBe(true);
    expect(isClassicSet("EGO1-EN001")).toBe(true);
    expect(isClassicSet("CT13-EN003")).toBe(false);
    expect(isClassicSet("EEN")).toBe(false);
    expect(isClassicSet("")).toBe(false);
  });
});

describe("isClassicCard", () => {
  it("is true when any printing is in a classic set", () => {
    expect(isClassicCard({ printings: [{ setCode: "CT13-EN003" }, { setCode: "SDY-006" }] })).toBe(true);
    expect(isClassicCard({ printings: [{ setCode: "CT13-EN003" }] })).toBe(false);
    expect(isClassicCard({ printings: [] })).toBe(false);
  });
});
