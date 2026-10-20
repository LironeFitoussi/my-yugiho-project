import { describe, expect, it } from "vitest";

import {
  cardCacheSk,
  cardCopyPrefix,
  cardCopySk,
  cardIdFromCopySk,
  cardKeyId,
  pricePk,
  wishlistCardSk,
} from "@/lib/aws/keys";

const COPY_ID = "3f1c2a7e-0d4b-4c1e-9a52-6b7d8e9f0a12";

describe("cardKeyId", () => {
  it("strips leading zeros so a printed passcode and a numeric id share one key", () => {
    expect(cardKeyId("00423585")).toBe("423585");
    expect(cardKeyId(423585)).toBe("423585");
    expect(cardKeyId("46986414")).toBe("46986414");
  });

  it.each([0, -1, "0", "000", "-46986414", 1.5, "4698.6414", Number.NaN, "abc", "", Number.MAX_SAFE_INTEGER + 2])(
    "rejects non-positive or non-integer id %s",
    (input) => {
      expect(() => cardKeyId(input as number | string)).toThrow(/Invalid card id/);
    },
  );

  it("is applied by every card-keyed builder", () => {
    expect(cardCopySk("0046986414", COPY_ID)).toBe(`CARD#46986414#COPY#${COPY_ID}`);
    expect(wishlistCardSk("00423585")).toBe("WISHLIST#CARD#423585");
    expect(cardCacheSk("00423585")).toBe("ID#423585");
    expect(pricePk("00423585")).toBe("PRICE#423585");
    expect(() => pricePk(0)).toThrow();
  });
});

describe("cardCopyPrefix", () => {
  it("ends with a delimiter so a shorter id never prefix-matches a longer one", () => {
    const shortPrefix = cardCopyPrefix(4698641);
    expect(shortPrefix.endsWith("#")).toBe(true);
    expect(cardCopySk(46986414, COPY_ID).startsWith(shortPrefix)).toBe(false);
    expect(cardCopySk(4698641, COPY_ID).startsWith(shortPrefix)).toBe(true);
  });
});

describe("cardIdFromCopySk", () => {
  it("round-trips the card id from a copy sort key", () => {
    expect(cardIdFromCopySk(cardCopySk(46986414, COPY_ID))).toBe(46986414);
    expect(cardIdFromCopySk(cardCopySk("00423585", COPY_ID))).toBe(423585);
  });

  it("rejects sort keys that are not card copies", () => {
    expect(() => cardIdFromCopySk("WISHLIST#CARD#46986414")).toThrow(/Not a card copy SK/);
    expect(() => cardIdFromCopySk("PURCHASE#p1#ITEM#COPY#c1")).toThrow();
    expect(() => cardIdFromCopySk("CARD#abc#COPY#c1")).toThrow();
  });
});
