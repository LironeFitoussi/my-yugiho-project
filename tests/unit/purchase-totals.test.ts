import { describe, expect, it } from "vitest";

import { purchasesTotalByCurrency, purchaseTotal, totalInvested } from "@/features/purchases/totals";

const usd = (amountMinor: number) => ({ amountMinor, currency: "USD" as const });
const ils = (amountMinor: number) => ({ amountMinor, currency: "ILS" as const });

describe("purchaseTotal", () => {
  it("adds shipping on top of the subtotal, kept as separate fields", () => {
    expect(purchaseTotal({ currency: "USD", subtotalMinor: 1250, shippingMinor: 499 })).toEqual(usd(1749));
  });
  it("is the subtotal alone when shipping is zero", () => {
    expect(purchaseTotal({ currency: "ILS", subtotalMinor: 3000, shippingMinor: 0 })).toEqual(ils(3000));
  });
});

describe("purchasesTotalByCurrency", () => {
  it("sums per currency and never mixes USD with ILS", () => {
    expect(
      purchasesTotalByCurrency([
        { currency: "USD", subtotalMinor: 1000, shippingMinor: 200 },
        { currency: "ILS", subtotalMinor: 5000, shippingMinor: 1500 },
        { currency: "USD", subtotalMinor: 10, shippingMinor: 0 },
      ]),
    ).toEqual({ USD: 1210, ILS: 6500 });
  });
});

describe("totalInvested", () => {
  const purchases = [{ currency: "USD" as const, subtotalMinor: 2000, shippingMinor: 500 }];

  it("counts linked copies only through their purchase (no double counting)", () => {
    const result = totalInvested({
      purchases,
      unlinkedCopies: [
        { purchasePrice: usd(2000), purchaseId: "p1" }, // already inside the purchase subtotal
        { purchasePrice: usd(300), purchaseId: null },
      ],
    });
    expect(result).toEqual({ USD: 2800, ILS: 0 });
  });

  it("adds unlinked product price and shipping, skips linked products", () => {
    const result = totalInvested({
      purchases: [],
      unlinkedProducts: [
        { price: ils(10000), shipping: ils(2500), purchaseId: null },
        { price: ils(99999), shipping: ils(99999), purchaseId: "p2" },
      ],
    });
    expect(result).toEqual({ USD: 0, ILS: 12500 });
  });

  it("excludes copies with no recorded price (never invents one)", () => {
    expect(totalInvested({ purchases: [], unlinkedCopies: [{ purchasePrice: null, purchaseId: null }] })).toEqual({
      USD: 0,
      ILS: 0,
    });
  });

  it("keeps mixed currencies in separate buckets", () => {
    const result = totalInvested({
      purchases: [
        { currency: "USD", subtotalMinor: 100, shippingMinor: 50 },
        { currency: "ILS", subtotalMinor: 400, shippingMinor: 0 },
      ],
      unlinkedCopies: [{ purchasePrice: ils(25), purchaseId: null }],
      unlinkedProducts: [{ price: usd(1000), shipping: null, purchaseId: null }],
    });
    expect(result).toEqual({ USD: 1150, ILS: 425 });
  });
});
