import { describe, expect, it } from "vitest";

import { valuationInCurrency, valueCopies } from "@/features/pricing/valuation";
import type { FxRate } from "@/lib/money";
import type { Card, CardCopy, CatalogPrice } from "@/types";

const AT = "2026-10-20T00:00:00.000Z";
const usd = (amountMinor: number): CatalogPrice => ({ amountMinor, currency: "USD", source: "test" });

function card(id: number, marketPrice: CatalogPrice | null, printingPrice: CatalogPrice | null = null): Card {
  return {
    id,
    name: `Card ${id}`,
    type: "Normal Monster",
    frameType: null,
    description: "",
    race: null,
    attribute: null,
    archetype: null,
    atk: null,
    def: null,
    level: null,
    imageUrl: null,
    imageUrlSmall: null,
    printings: [{ setName: "S", setCode: `S-${id}`, rarity: "Common", rarityCode: null, price: printingPrice }],
    marketPrice,
  };
}

function copy(copyId: string, cardId: number, printingSetCode: string | null = null): CardCopy {
  return {
    copyId,
    cardId,
    cardName: `Card ${cardId}`,
    printingSetCode,
    printingRarity: null,
    condition: "Near Mint",
    purchasePrice: null,
    purchaseId: null,
    acquiredAt: null,
    notes: "",
    createdAt: AT,
    updatedAt: AT,
  };
}

const rate: FxRate = {
  base: "USD",
  quote: "ILS",
  rate: "3.1077",
  rateDate: "2026-10-20",
  fetchedAt: AT,
  source: "frankfurter (ECB)",
};

describe("valueCopies", () => {
  const cards = new Map<number, Card>([
    [1, card(1, usd(1000), usd(2500))],
    [2, card(2, usd(333))],
    [3, card(3, null)],
  ]);

  it("sums priced copies only and counts each basis; duplicates are valued per copy", () => {
    const copies = [copy("a", 1, "S-1"), copy("b", 1), copy("c", 2), copy("d", 3), copy("e", 99)];
    const v = valueCopies(copies, cards, AT);
    expect(v.totalUsdMinor).toBe(2500 + 1000 + 333);
    expect(v.pricedCount).toBe(3);
    expect(v.estimatedCount).toBe(2);
    expect(v.unpriced.map((c) => c.copyId)).toEqual(["d", "e"]);
    expect(v.quotes.get("a")?.basis).toBe("printing");
    expect(v.quotes.get("b")?.basis).toBe("card-estimate");
    expect(v.quotes.get("e")?.basis).toBe("unavailable");
    expect(v.quotes.size).toBe(5);
  });

  it("returns zero totals for an empty collection", () => {
    const v = valueCopies([], cards, AT);
    expect(v).toMatchObject({ totalUsdMinor: 0, pricedCount: 0, estimatedCount: 0, unpriced: [] });
  });
});

describe("valuationInCurrency", () => {
  it("converts with decimal math and returns the rate used", () => {
    // 100.00 USD × 3.1077 = 310.77 ILS
    const r = valuationInCurrency({ amountMinor: 10000, currency: "USD" }, rate, "ILS");
    expect(r.amount).toEqual({ amountMinor: 31077, currency: "ILS" });
    expect(r.rate).toBe(rate);
  });

  it("rounds once at the end (0.01 USD → 0.03 ILS)", () => {
    expect(valuationInCurrency({ amountMinor: 1, currency: "USD" }, rate, "ILS").amount).toEqual({
      amountMinor: 3,
      currency: "ILS",
    });
  });

  it("returns null instead of inventing a rate", () => {
    expect(valuationInCurrency({ amountMinor: 10000, currency: "USD" }, null, "ILS")).toEqual({
      amount: null,
      rate: null,
    });
  });

  it("needs no rate for the same currency", () => {
    expect(valuationInCurrency({ amountMinor: 10000, currency: "USD" }, null, "USD")).toEqual({
      amount: { amountMinor: 10000, currency: "USD" },
      rate: null,
    });
  });
});
