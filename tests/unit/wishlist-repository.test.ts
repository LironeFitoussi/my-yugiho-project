import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("@/lib/aws/client", () => ({
  ddb: () => ({ send }),
  tableName: () => "test-table",
  GSI1: "GSI1",
}));

vi.mock("@/lib/auth", () => ({
  requireOwner: vi.fn(async () => ({ sub: "1", name: null, email: null, image: null })),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T,>(fn: T) => fn,
}));

import {
  createProductWish,
  deleteWish,
  putCardWish,
  queryWishlist,
  updateCardWish,
  updateProductWish,
} from "@/features/wishlist/repository";
import { productWishFormSchema } from "@/features/wishlist/schemas";
import { buildWishlistEntries, countWishlist, filterWishlist, ownedCountsByCard } from "@/features/wishlist/view";
import type { Card, WishlistItem } from "@/types";

const conditionalFailure = () => Object.assign(new Error("failed"), { name: "ConditionalCheckFailedException" });

beforeEach(() => send.mockReset());

describe("putCardWish", () => {
  it("writes one entry per card with a no-overwrite condition", async () => {
    send.mockResolvedValueOnce({});
    const result = await putCardWish({ id: 46986414, name: "Dark Magician" }, { desiredQuantity: 3, notes: "" });
    expect(result).toEqual({ ok: true });
    const cmd = send.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PutCommand);
    expect(cmd.input.ConditionExpression).toBe("attribute_not_exists(PK)");
    expect(cmd.input.Item).toMatchObject({
      PK: "USER#OWNER",
      SK: "WISHLIST#CARD#46986414",
      entityType: "WISHLIST",
      wishKind: "CARD",
      cardId: 46986414,
      desiredQuantity: 3,
    });
    expect(cmd.input.Item.createdAt).toBe(cmd.input.Item.updatedAt);
  });

  it("canonicalizes passcodes with leading zeros", async () => {
    send.mockResolvedValueOnce({});
    await putCardWish({ id: Number("00423585"), name: "Summoned Skull" }, { desiredQuantity: 1, notes: "" });
    expect(send.mock.calls[0][0].input.Item.SK).toBe("WISHLIST#CARD#423585");
  });

  it("reports an existing entry instead of overwriting it", async () => {
    send.mockRejectedValueOnce(conditionalFailure());
    expect(await putCardWish({ id: 1, name: "X" }, { desiredQuantity: 1, notes: "" })).toEqual({
      ok: false,
      error: "exists",
    });
  });

  it("rethrows other errors", async () => {
    send.mockRejectedValueOnce(new Error("boom"));
    await expect(putCardWish({ id: 1, name: "X" }, { desiredQuantity: 1, notes: "" })).rejects.toThrow("boom");
  });
});

describe("updateCardWish", () => {
  it("only updates an existing entry", async () => {
    send.mockRejectedValueOnce(conditionalFailure());
    expect(await updateCardWish(5, { desiredQuantity: 2, notes: "" })).toEqual({ ok: false, error: "not_found" });
    const cmd = send.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(UpdateCommand);
    expect(cmd.input.ConditionExpression).toBe("attribute_exists(PK)");
    expect(cmd.input.Key).toEqual({ PK: "USER#OWNER", SK: "WISHLIST#CARD#5" });
  });
});

describe("product wishes", () => {
  const input = productWishFormSchema.parse({
    name: "Legend of Blue Eyes White Dragon Booster Box",
    category: "Booster Box",
    setCode: "lob",
    notes: "",
    fulfilledByProductId: "",
  });

  it("starts unfulfilled — never auto-matched to a product", async () => {
    send.mockResolvedValueOnce({});
    const wishId = await createProductWish(input);
    const cmd = send.mock.calls[0][0];
    expect(send).toHaveBeenCalledTimes(1); // no product lookup / matching
    expect(cmd).toBeInstanceOf(PutCommand);
    expect(cmd.input.ConditionExpression).toBe("attribute_not_exists(PK)");
    expect(cmd.input.Item.SK).toBe(`WISHLIST#PRODUCT#${wishId}`);
    expect(cmd.input.Item.setCode).toBe("LOB");
    expect(cmd.input.Item.fulfilledByProductId).toBeUndefined();
  });

  it("removes the fulfilled link when cleared", async () => {
    send.mockResolvedValueOnce({});
    await updateProductWish("6f1c1c2e-4a4b-4c47-9a53-1d2b3c4d5e6f", input);
    const expr: string = send.mock.calls[0][0].input.UpdateExpression;
    expect(expr).toMatch(/REMOVE .*fulfilledByProductId/);
  });

  it("only treats an explicitly linked, existing product as owned", () => {
    const items: WishlistItem[] = [
      { ...input, kind: "PRODUCT", wishId: "a", fulfilledByProductId: null, createdAt: "2026-01-01" },
      { ...input, kind: "PRODUCT", wishId: "b", fulfilledByProductId: "p1", createdAt: "2026-01-02" },
      { ...input, kind: "PRODUCT", wishId: "c", fulfilledByProductId: "deleted", createdAt: "2026-01-03" },
    ];
    // A product with the same name exists, but wish "a" isn't linked to it → still wanted.
    const products = [{ productId: "p1", name: input.name }];
    const entries = buildWishlistEntries({ items, ownedCounts: new Map(), products, pricedAt: "now" });
    const status = Object.fromEntries(entries.map((e) => [e.kind === "PRODUCT" ? e.item.wishId : "", e.status]));
    expect(status).toEqual({ a: "wanted", b: "owned", c: "wanted" });
  });
});

describe("queryWishlist / deleteWish", () => {
  it("queries the wishlist prefix, follows pages and skips malformed items", async () => {
    send
      .mockResolvedValueOnce({
        Items: [
          {
            SK: "WISHLIST#CARD#1",
            wishKind: "CARD",
            cardId: 1,
            cardName: "A",
            desiredQuantity: 2,
            createdAt: "2026-01-01",
          },
          { SK: "WISHLIST#CARD#bad", wishKind: "CARD" },
        ],
        LastEvaluatedKey: { PK: "USER#OWNER", SK: "WISHLIST#CARD#1" },
      })
      .mockResolvedValueOnce({ Items: [] });
    const items = await queryWishlist();
    expect(items).toEqual([{ kind: "CARD", cardId: 1, cardName: "A", desiredQuantity: 2, notes: "", createdAt: "2026-01-01" }]);
    const cmd = send.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(QueryCommand);
    expect(cmd.input.ExpressionAttributeValues).toEqual({ ":pk": "USER#OWNER", ":prefix": "WISHLIST#" });
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ PK: "USER#OWNER", SK: "WISHLIST#CARD#1" });
  });

  it("refuses to delete non-wishlist keys", async () => {
    await expect(deleteWish("CARD#1#COPY#x")).rejects.toThrow();
    send.mockResolvedValueOnce({});
    await deleteWish("WISHLIST#CARD#1");
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteCommand);
  });
});

describe("card wish ownership and pricing", () => {
  const card = (id: number, marketMinor: number | null): Card => ({
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
    printings: [],
    marketPrice: marketMinor ? { amountMinor: marketMinor, currency: "USD", source: "tcgplayer" } : null,
  });
  const wish = (cardId: number, desiredQuantity: number): WishlistItem => ({
    kind: "CARD",
    cardId,
    cardName: `Card ${cardId}`,
    desiredQuantity,
    notes: "",
    createdAt: `2026-01-0${cardId}`,
  });

  it("shows owned vs wanted copies, estimates or Price Unavailable, and filters", () => {
    const ownedCounts = ownedCountsByCard([{ cardId: 1 }, { cardId: 2 }, { cardId: 2 }, { cardId: 2 }]);
    const entries = buildWishlistEntries({
      items: [wish(1, 3), wish(2, 3), wish(3, 1)],
      ownedCounts,
      cardsById: new Map([
        [1, card(1, 250)],
        [2, card(2, null)],
      ]),
      products: [],
      pricedAt: "2026-10-20T00:00:00.000Z",
    });
    const byId = new Map(entries.map((e) => [e.kind === "CARD" ? e.item.cardId : 0, e]));
    const one = byId.get(1)!;
    expect(one.kind === "CARD" && [one.ownedCount, one.status, one.quote?.basis]).toEqual([1, "wanted", "card-estimate"]);
    const two = byId.get(2)!;
    expect(two.kind === "CARD" && [two.ownedCount, two.status, two.quote?.basis]).toEqual([3, "owned", "unavailable"]);
    const three = byId.get(3)!;
    expect(three.kind === "CARD" && three.quote?.basis).toBe("unavailable");

    expect(countWishlist(entries)).toEqual({ total: 3, wanted: 2, owned: 1, cards: 3, products: 0 });
    expect(filterWishlist(entries, { kind: "all", status: "owned", q: "" })).toHaveLength(1);
    expect(filterWishlist(entries, { kind: "product", status: "all", q: "" })).toHaveLength(0);
    expect(filterWishlist(entries, { kind: "card", status: "all", q: "card 3" })).toHaveLength(1);
  });
});
