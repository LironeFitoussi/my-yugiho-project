import { describe, expect, it } from "vitest";

import { addMoney, convert, parseMoneyInput, sumByCurrency } from "@/lib/money";

describe("parseMoneyInput", () => {
  it("parses decimals with string math", () => {
    expect(parseMoneyInput("12.5", "USD")).toEqual({ amountMinor: 1250, currency: "USD" });
    expect(parseMoneyInput("0.1", "USD")).toEqual({ amountMinor: 10, currency: "USD" });
    expect(parseMoneyInput("1,000.00", "ILS")).toEqual({ amountMinor: 100000, currency: "ILS" });
  });
  it("rejects empty, negative and over-precise input", () => {
    expect(parseMoneyInput("", "USD")).toBeNull();
    expect(parseMoneyInput("-1", "USD")).toBeNull();
    expect(parseMoneyInput("1.005", "USD")).toBeNull();
  });
});

describe("money arithmetic", () => {
  it("refuses to add mixed currencies", () => {
    expect(() => addMoney({ amountMinor: 1, currency: "USD" }, { amountMinor: 1, currency: "ILS" })).toThrow();
  });
  it("sums per currency", () => {
    expect(
      sumByCurrency([
        { amountMinor: 10, currency: "USD" },
        { amountMinor: 5, currency: "ILS" },
        { amountMinor: 20, currency: "USD" },
      ]),
    ).toEqual({ USD: 30, ILS: 5 });
  });
  it("converts with a decimal rate in either direction, rounding once", () => {
    const fx = { base: "USD", quote: "ILS", rate: "3.7123", rateDate: "2026-10-20", fetchedAt: "x", source: "test" } as const;
    expect(convert({ amountMinor: 1000, currency: "USD" }, "ILS", fx)).toEqual({ amountMinor: 3712, currency: "ILS" });
    expect(convert({ amountMinor: 3712, currency: "ILS" }, "USD", fx)).toEqual({ amountMinor: 1000, currency: "USD" });
  });
});
