import { describe, expect, it } from "vitest";

import { collectionFiltersSchema, copyFormSchema, copyRefSchema, printingKey } from "@/features/collection/schemas";

const printings = [
  { setCode: "LOB-005", rarity: "Ultra Rare" },
  { setCode: "SDY-006", rarity: "Common" },
];
const schema = copyFormSchema(printings);
const base = { condition: "Near Mint", price: "", currency: "USD", acquiredAt: "", notes: "", printing: "" };

describe("copyFormSchema", () => {
  it("accepts a minimal copy with no price, date or printing", () => {
    const r = schema.parse(base);
    expect(r).toEqual({
      printingSetCode: null,
      printingRarity: null,
      condition: "Near Mint",
      purchasePrice: null,
      acquiredAt: null,
      notes: "",
    });
  });

  it("parses prices into integer minor units via the money module", () => {
    expect(schema.parse({ ...base, price: "12.5" }).purchasePrice).toEqual({ amountMinor: 1250, currency: "USD" });
    expect(schema.parse({ ...base, price: "0.1", currency: "ILS" }).purchasePrice).toEqual({
      amountMinor: 10,
      currency: "ILS",
    });
    expect(schema.parse({ ...base, price: "1,000.00" }).purchasePrice).toEqual({ amountMinor: 100000, currency: "USD" });
  });

  it("rejects invalid prices and currencies", () => {
    expect(schema.safeParse({ ...base, price: "-1" }).success).toBe(false);
    expect(schema.safeParse({ ...base, price: "1.005" }).success).toBe(false);
    expect(schema.safeParse({ ...base, price: "abc" }).success).toBe(false);
    expect(schema.safeParse({ ...base, price: "1", currency: "EUR" }).success).toBe(false);
  });

  it("only accepts the six PRD conditions", () => {
    expect(schema.safeParse({ ...base, condition: "Damaged" }).success).toBe(true);
    expect(schema.safeParse({ ...base, condition: "Excellent" }).success).toBe(false);
    expect(schema.safeParse({ ...base, condition: undefined }).success).toBe(false);
  });

  it("validates acquired dates", () => {
    expect(schema.parse({ ...base, acquiredAt: "2026-02-28" }).acquiredAt).toBe("2026-02-28");
    expect(schema.safeParse({ ...base, acquiredAt: "2026-02-30" }).success).toBe(false);
    expect(schema.safeParse({ ...base, acquiredAt: "20/10/2026" }).success).toBe(false);
    expect(schema.safeParse({ ...base, acquiredAt: "2026-13-01" }).success).toBe(false);
  });

  it("requires the printing to be one of the card's printings", () => {
    const r = schema.parse({ ...base, printing: printingKey(printings[0]) });
    expect(r.printingSetCode).toBe("LOB-005");
    expect(r.printingRarity).toBe("Ultra Rare");
    const bad = schema.safeParse({ ...base, printing: "MRD-001|Common" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0].path).toEqual(["printing"]);
  });

  it("limits notes to 1000 characters", () => {
    expect(schema.safeParse({ ...base, notes: "x".repeat(1000) }).success).toBe(true);
    expect(schema.safeParse({ ...base, notes: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("copyRefSchema", () => {
  it("requires a positive integer card id and a uuid copy id", () => {
    const copyId = "0b6f5c1e-9a57-4d4e-8f0c-6f6b0f2f1a11";
    expect(copyRefSchema.safeParse({ cardId: "46986414", copyId }).success).toBe(true);
    expect(copyRefSchema.safeParse({ cardId: "0", copyId }).success).toBe(false);
    expect(copyRefSchema.safeParse({ cardId: "1.5", copyId }).success).toBe(false);
    expect(copyRefSchema.safeParse({ cardId: "1", copyId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("collectionFiltersSchema", () => {
  it("drops invalid conditions instead of failing", () => {
    expect(collectionFiltersSchema.parse({ q: " magician ", condition: "Bogus" })).toEqual({
      q: "magician",
      condition: undefined,
    });
  });
});
