import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  normalizeCard,
  normalizeSets,
  parseUsdPrice,
  pickMarketPrice,
  toCardSummary,
} from "@/lib/ygoprodeck/normalize";
import { parseEach, rawCardInfoEnvelopeSchema, rawCardSchema, rawSetSchema, type RawCard } from "@/lib/ygoprodeck/schemas";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(__dirname, "../fixtures/ygoprodeck", name), "utf8"));

function cards(name: string): RawCard[] {
  const env = rawCardInfoEnvelopeSchema.parse(fixture(name));
  return parseEach(env.data, rawCardSchema);
}

describe("parseUsdPrice", () => {
  it("parses decimal strings into integer cents with string math", () => {
    expect(parseUsdPrice("6.97", "x")).toEqual({ amountMinor: 697, currency: "USD", source: "x" });
    expect(parseUsdPrice("2.1", "x")?.amountMinor).toBe(210);
    expect(parseUsdPrice("0.29", "x")?.amountMinor).toBe(29); // 0.29*100 is 28.999… in floats
    expect(parseUsdPrice("1,234.50", "x")?.amountMinor).toBe(123450);
  });

  it("treats missing, zero and malformed prices as unavailable", () => {
    for (const v of [undefined, null, "", "0", "0.00", "abc", "-1.00", "1.234"]) {
      expect(parseUsdPrice(v, "x")).toBeNull();
    }
  });
});

describe("pickMarketPrice", () => {
  it("uses tcgplayer first and records the source", () => {
    expect(pickMarketPrice([{ tcgplayer_price: "0.33", ebay_price: "0.99" }])).toEqual({
      amountMinor: 33,
      currency: "USD",
      source: "tcgplayer",
    });
  });

  it("falls back through USD sources and never uses cardmarket (EUR)", () => {
    expect(pickMarketPrice([{ cardmarket_price: "5.00", tcgplayer_price: "0.00", ebay_price: "1.99" }])?.source).toBe(
      "ebay",
    );
    expect(
      pickMarketPrice([{ cardmarket_price: "5.00", tcgplayer_price: "0", ebay_price: "0.00", amazon_price: "0.00", coolstuffinc_price: "0.49" }]),
    ).toEqual({ amountMinor: 49, currency: "USD", source: "coolstuffinc" });
    expect(pickMarketPrice([{ cardmarket_price: "5.00", tcgplayer_price: "0.00" }])).toBeNull();
    expect(pickMarketPrice([])).toBeNull();
    expect(pickMarketPrice(undefined)).toBeNull();
  });
});

describe("normalizeCard", () => {
  it("normalizes a normal monster (Dark Magician)", () => {
    const card = normalizeCard(cards("cardinfo-id-46986414.json")[0]!);
    expect(card).toMatchObject({
      id: 46986414,
      name: "Dark Magician",
      type: "Normal Monster",
      frameType: "normal",
      race: "Spellcaster",
      attribute: "DARK",
      archetype: "Dark Magician",
      atk: 2500,
      def: 2100,
      level: 7,
      imageUrl: "https://images.ygoprodeck.com/images/cards/46986414.jpg",
      imageUrlSmall: "https://images.ygoprodeck.com/images/cards_small/46986414.jpg",
      marketPrice: { amountMinor: 33, currency: "USD", source: "tcgplayer" },
    });
    expect(card.printings[0]).toEqual({
      setName: "2016 Mega-Tins",
      setCode: "CT13-EN003",
      rarity: "Ultra Rare",
      rarityCode: "(UR)",
      price: { amountMinor: 697, currency: "USD", source: "tcgplayer-set-price" },
    });
    // "0.00" printing price → unavailable, never zero
    expect(card.printings.find((p) => p.setCode === "25TH-EN001")?.price).toBeNull();
  });

  it("picks the artwork matching the card id when several are listed", () => {
    const card = normalizeCard(cards("cardinfo-name-dark-magician.json")[0]!);
    expect(card.id).toBe(46986414);
    expect(card.imageUrl).toContain("/46986414.jpg");
  });

  it("nulls level/DEF for Link monsters", () => {
    const card = normalizeCard(cards("cardinfo-link-monster.json")[0]!);
    expect(card.type).toBe("Link Monster");
    expect(card.level).toBeNull();
    expect(card.def).toBeNull();
    expect(card.atk).toBe(2300);
  });

  it("handles spell cards without monster stats", () => {
    const card = normalizeCard(cards("cardinfo-spell.json")[0]!);
    expect(card).toMatchObject({ name: "Monster Reborn", type: "Spell Card", attribute: null, atk: null, def: null, level: null });
    expect(card.printings.find((p) => p.setCode === "BP02-EN128")?.price?.amountMinor).toBe(210);
  });

  it("summaries carry the classic flag from printings", () => {
    const lob = cards("cardinfo-cardset-lob.json").map((raw) => toCardSummary(normalizeCard(raw)));
    expect(lob.every((c) => c.isClassic)).toBe(true);
    const reborn = toCardSummary(normalizeCard(cards("cardinfo-spell.json")[0]!));
    expect(reborn.isClassic).toBe(false); // fixture trimmed to non-classic printings
  });

  it("drops malformed records instead of failing the page", () => {
    const parsed = parseEach([{ id: "x" }, (fixture("cardinfo-spell.json") as { data: unknown[] }).data[0]], rawCardSchema);
    expect(parsed).toHaveLength(1);
  });
});

describe("normalizeSets", () => {
  const sets = normalizeSets(parseEach(fixture("cardsets.json") as unknown[], rawSetSchema));

  it("gives the largest set the bare code and disambiguates the rest", () => {
    expect(sets.find((s) => s.code === "IOC")?.name).toBe("Invasion of Chaos");
    expect(sets.find((s) => s.code === "IOC_2")?.name).toBe("Invasion of Chaos: Special Edition");
    expect(sets.find((s) => s.code === "SDY")?.name).toBe("Starter Deck: Yugi");
    expect(sets.find((s) => s.code === "LOB")?.name).toBe("Legend of Blue Eyes White Dragon");
    expect(new Set(sets.map((s) => s.code)).size).toBe(sets.length);
  });

  it("maps fields and the classic flag", () => {
    expect(sets.find((s) => s.code === "LOB")).toMatchObject({ releaseDate: "2002-03-08", isClassic: true });
    expect(sets.find((s) => s.code === "IOC_2")?.isClassic).toBe(true);
    expect(sets.find((s) => s.code === "STAX")).toMatchObject({ imageUrl: null, isClassic: false });
  });
});
