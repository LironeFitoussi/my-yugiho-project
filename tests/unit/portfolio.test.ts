import { describe, expect, it } from "vitest";

import { chooseDashboardSets } from "@/features/dashboard/set-progress";
import { buildPortfolioSummary } from "@/features/portfolio/summary";
import type { FxRate } from "@/lib/money";
import type { Card, CardCopy, CardSet, Product, Purchase } from "@/types";

const NOW = "2026-10-20T12:00:00.000Z";

const fx: FxRate = {
  base: "USD",
  quote: "ILS",
  rate: "3.7",
  rateDate: "2026-10-19",
  fetchedAt: "2026-10-20T08:00:00.000Z",
  source: "frankfurter (ECB)",
};

const card = (id: number, marketMinor: number | null, printings: Card["printings"] = []): Card => ({
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
  printings,
  marketPrice: marketMinor ? { amountMinor: marketMinor, currency: "USD", source: "tcgplayer" } : null,
});

let n = 0;
const copy = (cardId: number, extra: Partial<CardCopy> = {}): CardCopy => ({
  copyId: `copy-${++n}`,
  cardId,
  cardName: `Card ${cardId}`,
  printingSetCode: null,
  printingRarity: null,
  condition: "Near Mint",
  purchasePrice: null,
  purchaseId: null,
  acquiredAt: null,
  notes: "",
  createdAt: NOW,
  updatedAt: NOW,
  ...extra,
});

const purchase = (currency: "USD" | "ILS", subtotalMinor: number, shippingMinor: number): Purchase => ({
  purchaseId: `p-${++n}`,
  date: "2026-10-01",
  seller: "Shop",
  currency,
  subtotalMinor,
  shippingMinor,
  itemCount: 1,
  notes: "",
  createdAt: NOW,
  updatedAt: NOW,
});

const product = (extra: Partial<Product> = {}): Product => ({
  productId: `prod-${++n}`,
  name: "Booster Box",
  category: "Booster Box",
  purchaseDate: null,
  seller: null,
  price: null,
  shipping: null,
  status: "sealed",
  purchaseId: null,
  notes: "",
  createdAt: NOW,
  updatedAt: NOW,
  ...extra,
});

describe("buildPortfolioSummary", () => {
  it("excludes unpriced copies from market value and lists them by card", () => {
    const copies = [
      copy(1, { printingSetCode: "LOB-001" }),
      copy(2),
      copy(3),
      copy(3),
    ];
    const cardsById = new Map([
      [1, card(1, 100, [{ setName: "LOB", setCode: "LOB-001", rarity: "Ultra Rare", rarityCode: null, price: { amountMinor: 900, currency: "USD", source: "tcgplayer" } }])],
      [2, card(2, 250)],
      [3, card(3, null)],
    ]);
    const s = buildPortfolioSummary({ copies, cardsById, purchases: [], products: [], fx: null, now: NOW });
    expect(s.market).not.toBeNull();
    expect(s.market!.totalUsd).toEqual({ amountMinor: 1150, currency: "USD" });
    expect(s.market!.printingCopies).toBe(1);
    expect(s.market!.estimatedCopies).toBe(1);
    expect(s.market!.unpricedCopies).toBe(2);
    expect(s.market!.unpricedCards).toEqual([{ cardId: 3, cardName: "Card 3", copies: 2 }]);
    expect(s.counts).toMatchObject({ uniqueCards: 3, copies: 4 });
    expect(s.valuedAt).toBe(NOW);
  });

  it("does not double count copies or products linked to a purchase", () => {
    const linked = copy(1, { purchaseId: "p-x", purchasePrice: { amountMinor: 500, currency: "USD" } });
    const unlinked = copy(2, { purchasePrice: { amountMinor: 300, currency: "USD" } });
    const s = buildPortfolioSummary({
      copies: [linked, unlinked],
      cardsById: new Map([[1, card(1, 100)]]),
      purchases: [purchase("USD", 500, 150)],
      products: [
        product({ purchaseId: "p-x", price: { amountMinor: 9999, currency: "USD" } }),
        product({ price: { amountMinor: 4000, currency: "ILS" }, shipping: { amountMinor: 1000, currency: "ILS" } }),
      ],
      fx: null,
      now: NOW,
    });
    expect(s.invested).toEqual({ USD: 500 + 150 + 300, ILS: 5000 });
  });

  it("without a rate: no ILS value and no cross-currency totals", () => {
    const s = buildPortfolioSummary({
      copies: [copy(1)],
      cardsById: new Map([[1, card(1, 1000)]]),
      purchases: [purchase("USD", 400, 0), purchase("ILS", 3700, 0)],
      products: [],
      fx: null,
      now: NOW,
    });
    expect(s.market!.totalIls).toBeNull();
    expect(s.investedIn).toEqual({ USD: null, ILS: null });
    expect(s.difference).toEqual({ USD: null, ILS: null });
  });

  it("without a rate but a single currency, the USD difference still works", () => {
    const s = buildPortfolioSummary({
      copies: [copy(1)],
      cardsById: new Map([[1, card(1, 1000)]]),
      purchases: [purchase("USD", 1500, 0)],
      products: [],
      fx: null,
      now: NOW,
    });
    expect(s.difference.USD).toEqual({ amountMinor: -500, currency: "USD" });
    expect(s.difference.ILS).toBeNull();
  });

  it("computes each currency's difference on its own, converting with the same rate", () => {
    const s = buildPortfolioSummary({
      copies: [copy(1)],
      cardsById: new Map([[1, card(1, 2000)]]),
      purchases: [purchase("USD", 1000, 0), purchase("ILS", 3700, 0)],
      products: [],
      fx,
      now: NOW,
    });
    // Invested: 10.00 USD + 37.00 ILS. In USD: 10 + 37/3.7 = 20.00. In ILS: 37 + 10*3.7 = 74.00.
    expect(s.investedIn.USD).toEqual({ amountMinor: 2000, currency: "USD" });
    expect(s.investedIn.ILS).toEqual({ amountMinor: 7400, currency: "ILS" });
    expect(s.market!.totalIls).toEqual({ amountMinor: 7400, currency: "ILS" });
    expect(s.difference.USD).toEqual({ amountMinor: 0, currency: "USD" });
    expect(s.difference.ILS).toEqual({ amountMinor: 0, currency: "ILS" });
    expect(s.difference.USD!.currency).toBe("USD");
    expect(s.fx).toBe(fx);
  });

  it("reports market value as unavailable when the catalog returned nothing, keeping invested totals", () => {
    const s = buildPortfolioSummary({
      copies: [copy(1, { purchasePrice: { amountMinor: 700, currency: "USD" } })],
      cardsById: new Map(),
      purchases: [],
      products: [],
      fx,
      now: NOW,
    });
    expect(s.market).toBeNull();
    expect(s.invested.USD).toBe(700);
    expect(s.difference).toEqual({ USD: null, ILS: null });
  });

  it("treats an empty collection as a zero market value, not unavailable", () => {
    const s = buildPortfolioSummary({ copies: [], cardsById: new Map(), purchases: [], products: [product()], fx: null, now: NOW });
    expect(s.market?.totalUsd).toEqual({ amountMinor: 0, currency: "USD" });
    expect(s.counts).toMatchObject({ products: 1, sealedProducts: 1 });
  });
});

describe("chooseDashboardSets", () => {
  const set = (code: string, releaseDate: string, isClassic = true): CardSet => ({
    code,
    name: code,
    cardCount: 10,
    releaseDate,
    imageUrl: null,
    isClassic,
  });
  const sets = [
    set("SDY", "2002-03-29"),
    set("LOB", "2002-03-08"),
    set("MRD", "2002-06-26"),
    set("NEW", "2024-01-01", false),
    set("PSV", "2002-10-20"),
  ];

  it("prefers classic sets matching recorded printings (most copies first), then fills by release date", () => {
    const chosen = chooseDashboardSets(sets, ["MRD-001", "PSV-002", "PSV-003", null, "NEW-001"], 3);
    expect(chosen.map((s) => s.code)).toEqual(["PSV", "MRD", "LOB"]);
  });

  it("is bounded and never includes non-classic sets", () => {
    const chosen = chooseDashboardSets(sets, [], 10);
    expect(chosen.map((s) => s.code)).toEqual(["LOB", "SDY", "MRD", "PSV"]);
  });
});
