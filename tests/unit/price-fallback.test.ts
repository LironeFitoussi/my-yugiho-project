import { describe, expect, it } from "vitest";

import { quoteCopy } from "@/features/pricing/quote";
import type { Card, CardPrinting, CatalogPrice } from "@/types";

const AT = "2026-10-20T00:00:00.000Z";
const usd = (amountMinor: number, source = "tcgplayer"): CatalogPrice => ({ amountMinor, currency: "USD", source });
const printing = (setCode: string, rarity: string, price: CatalogPrice | null): CardPrinting => ({
  setName: "Legend of Blue Eyes White Dragon",
  setCode,
  rarity,
  rarityCode: null,
  price,
});
const card = (printings: CardPrinting[], marketPrice: CatalogPrice | null): Card => ({
  id: 89631139,
  name: "Blue-Eyes White Dragon",
  type: "Normal Monster",
  frameType: "normal",
  description: "",
  race: "Dragon",
  attribute: "LIGHT",
  archetype: null,
  atk: 3000,
  def: 2500,
  level: 8,
  imageUrl: null,
  imageUrlSmall: null,
  printings,
  marketPrice,
});
const copy = (printingSetCode: string | null, printingRarity: string | null = null) => ({
  cardId: 89631139,
  printingSetCode,
  printingRarity,
});

describe("quoteCopy (PRD §12 priority)", () => {
  it("uses the printing-specific price when the copy's printing has one", () => {
    const c = card([printing("LOB-001", "Ultra Rare", usd(4500, "printing-src"))], usd(1000, "card-src"));
    expect(quoteCopy(copy("LOB-001"), c, AT)).toEqual({
      basis: "printing",
      amount: { amountMinor: 4500, currency: "USD" },
      pricedAt: AT,
      source: "printing-src",
    });
  });

  it("matches set code case-insensitively", () => {
    const c = card([printing("LOB-001", "Ultra Rare", usd(4500))], null);
    expect(quoteCopy(copy("lob-001"), c, AT).basis).toBe("printing");
  });

  it("falls back to the card price labelled estimate when no printing is recorded", () => {
    const c = card([printing("LOB-001", "Ultra Rare", usd(4500))], usd(1000, "card-src"));
    expect(quoteCopy(copy(null), c, AT)).toEqual({
      basis: "card-estimate",
      amount: { amountMinor: 1000, currency: "USD" },
      pricedAt: AT,
      source: "card-src",
    });
  });

  it("falls back when the printing is not in the catalog or has no price", () => {
    const c = card([printing("LOB-001", "Ultra Rare", null)], usd(1000));
    expect(quoteCopy(copy("SDK-001"), c, AT).basis).toBe("card-estimate");
    expect(quoteCopy(copy("LOB-001"), c, AT).basis).toBe("card-estimate");
  });

  it("ignores zero prices at both levels", () => {
    const c = card([printing("LOB-001", "Ultra Rare", usd(0))], usd(0));
    expect(quoteCopy(copy("LOB-001"), c, AT)).toEqual({
      basis: "unavailable",
      amount: null,
      pricedAt: AT,
      source: null,
    });
  });

  it("is unavailable when nothing is priced — never invents a price", () => {
    const q = quoteCopy(copy("LOB-001"), card([], null), AT);
    expect(q.basis).toBe("unavailable");
    expect(q.amount).toBeNull();
  });

  it("is unavailable with no timestamp when the card is unknown", () => {
    expect(quoteCopy(copy("LOB-001"), undefined, AT)).toEqual({
      basis: "unavailable",
      amount: null,
      pricedAt: null,
      source: null,
    });
  });

  describe("rarity disambiguation", () => {
    const c = card(
      [printing("SDY-006", "Common", usd(50)), printing("SDY-006", "Ultra Rare", usd(800))],
      usd(200),
    );

    it("picks the printing matching the recorded rarity", () => {
      const q = quoteCopy(copy("SDY-006", "ultra rare"), c, AT);
      expect(q.basis).toBe("printing");
      expect(q.amount).toEqual({ amountMinor: 800, currency: "USD" });
    });

    it("falls back to the card estimate when rarity is unknown and prices disagree", () => {
      const q = quoteCopy(copy("SDY-006"), c, AT);
      expect(q.basis).toBe("card-estimate");
      expect(q.amount).toEqual({ amountMinor: 200, currency: "USD" });
    });

    it("uses the shared price when all candidates agree", () => {
      const same = card(
        [printing("SDY-006", "Common", usd(50)), printing("SDY-006", "Ultra Rare", usd(50))],
        usd(200),
      );
      expect(quoteCopy(copy("SDY-006"), same, AT).basis).toBe("printing");
    });

    it("falls back when the recorded rarity does not exist for that code", () => {
      expect(quoteCopy(copy("SDY-006", "Secret Rare"), c, AT).basis).toBe("card-estimate");
    });
  });
});
