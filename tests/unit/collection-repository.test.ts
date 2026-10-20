import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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

// React cache() only memoizes inside a server request; make it a passthrough in tests.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T,>(fn: T) => fn,
}));

import { listOwnedCardIds } from "@/features/collection/queries";
import {
  createCopy,
  deleteCopy,
  queryAllCopies,
  queryRecentAcquisitions,
  updateCopy,
} from "@/features/collection/repository";
import type { CardCopy } from "@/types";

const item = (cardId: number, copyId: string, extra: Record<string, unknown> = {}) => ({
  PK: "USER#OWNER",
  SK: `CARD#${cardId}#COPY#${copyId}`,
  entityType: "CARD_COPY",
  copyId,
  cardId,
  cardName: `Card ${cardId}`,
  condition: "Near Mint",
  notes: "",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  ...extra,
});

const conditionalFailure = () => Object.assign(new Error("failed"), { name: "ConditionalCheckFailedException" });

beforeEach(() => send.mockReset());

describe("createCopy", () => {
  it("puts a new copy with correct keys and a no-overwrite condition", async () => {
    send.mockResolvedValueOnce({});
    const copy = await createCopy(
      { id: 46986414, name: "Dark Magician" },
      {
        printingSetCode: "LOB-005",
        printingRarity: "Ultra Rare",
        condition: "Near Mint",
        purchasePrice: { amountMinor: 1250, currency: "USD" },
        acquiredAt: "2026-10-20",
        notes: "",
      },
    );
    const cmd = send.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PutCommand);
    const input = cmd.input;
    expect(input.ConditionExpression).toBe("attribute_not_exists(PK)");
    expect(input.Item.PK).toBe("USER#OWNER");
    expect(input.Item.SK).toBe(`CARD#46986414#COPY#${copy.copyId}`);
    expect(input.Item.GSI1PK).toBe("USER#OWNER#COPIES");
    expect(input.Item.GSI1SK).toBe(`ACQ#2026-10-20#${input.Item.createdAt}#${copy.copyId}`);
    expect(input.Item.entityType).toBe("CARD_COPY");
    expect(input.Item.purchasePriceMinor).toBe(1250);
    expect(input.Item.purchasePriceCurrency).toBe("USD");
    expect(input.Item.purchaseId).toBeUndefined();
    expect(copy.purchasePrice).toEqual({ amountMinor: 1250, currency: "USD" });
  });

  it("gives every copy its own copyId (duplicates are separate records)", async () => {
    send.mockResolvedValue({});
    const input = {
      printingSetCode: null,
      printingRarity: null,
      condition: "Mint" as const,
      purchasePrice: null,
      acquiredAt: null,
      notes: "",
    };
    const a = await createCopy({ id: 1, name: "X" }, input);
    const b = await createCopy({ id: 1, name: "X" }, input);
    expect(a.copyId).not.toBe(b.copyId);
    // Without an acquired date, GSI1SK falls back to the creation date.
    expect(send.mock.calls[0][0].input.Item.GSI1SK).toMatch(/^ACQ#\d{4}-\d{2}-\d{2}#/);
  });
});

describe("updateCopy", () => {
  const existing: CardCopy = {
    copyId: "c1",
    cardId: 5,
    cardName: "Card 5",
    printingSetCode: "LOB-001",
    printingRarity: "Common",
    condition: "Near Mint",
    purchasePrice: { amountMinor: 100, currency: "USD" },
    purchaseId: null,
    acquiredAt: "2026-01-01",
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("requires the item to exist, rewrites GSI1SK and removes cleared fields", async () => {
    send.mockResolvedValueOnce({});
    const res = await updateCopy(existing, {
      printingSetCode: null,
      printingRarity: null,
      condition: "Damaged",
      purchasePrice: null,
      acquiredAt: "2026-05-05",
      notes: "bent",
    });
    expect(res).toEqual({ ok: true });
    const cmd = send.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(UpdateCommand);
    expect(cmd.input.Key).toEqual({ PK: "USER#OWNER", SK: "CARD#5#COPY#c1" });
    expect(cmd.input.ConditionExpression).toBe("attribute_exists(PK)");
    expect(cmd.input.ExpressionAttributeValues[":gsi1sk"]).toBe("ACQ#2026-05-05#2026-01-01T00:00:00.000Z#c1");
    expect(cmd.input.UpdateExpression).toContain("REMOVE");
    expect(cmd.input.UpdateExpression).toContain("#purchasePriceMinor");
    expect(cmd.input.UpdateExpression).not.toContain("purchaseId");
    expect(cmd.input.UpdateExpression).not.toContain("cardId");
  });

  it("reports not_found when the condition fails", async () => {
    send.mockRejectedValueOnce(conditionalFailure());
    const res = await updateCopy(existing, {
      printingSetCode: null,
      printingRarity: null,
      condition: "Mint",
      purchasePrice: null,
      acquiredAt: null,
      notes: "",
    });
    expect(res).toEqual({ ok: false, error: "not_found" });
  });
});

describe("deleteCopy", () => {
  it("refuses to delete copies linked to a purchase", async () => {
    send.mockResolvedValueOnce({});
    await deleteCopy(5, "c1");
    const cmd = send.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(DeleteCommand);
    expect(cmd.input.Key).toEqual({ PK: "USER#OWNER", SK: "CARD#5#COPY#c1" });
    expect(cmd.input.ConditionExpression).toContain("attribute_not_exists(purchaseId)");
    expect(cmd.input.ConditionExpression).toContain("attribute_exists(PK)");
  });

  it("returns linked_to_purchase when the copy still exists", async () => {
    send.mockRejectedValueOnce(conditionalFailure());
    send.mockResolvedValueOnce({ Item: item(5, "c1", { purchaseId: "p1" }) });
    expect(await deleteCopy(5, "c1")).toEqual({ ok: false, error: "linked_to_purchase" });
    expect(send.mock.calls[1][0]).toBeInstanceOf(GetCommand);
  });

  it("returns not_found when the copy is gone", async () => {
    send.mockRejectedValueOnce(conditionalFailure());
    send.mockResolvedValueOnce({});
    expect(await deleteCopy(5, "c1")).toEqual({ ok: false, error: "not_found" });
  });
});

describe("queries", () => {
  it("follows LastEvaluatedKey across pages with a begins_with query (no scan)", async () => {
    send.mockResolvedValueOnce({ Items: [item(1, "a")], LastEvaluatedKey: { PK: "USER#OWNER", SK: "x" } });
    send.mockResolvedValueOnce({ Items: [item(2, "b")] });
    const copies = await queryAllCopies();
    expect(copies.map((c) => c.copyId)).toEqual(["a", "b"]);
    expect(send).toHaveBeenCalledTimes(2);
    const first = send.mock.calls[0][0];
    expect(first).toBeInstanceOf(QueryCommand);
    expect(first.input.KeyConditionExpression).toContain("begins_with(SK, :prefix)");
    expect(first.input.ExpressionAttributeValues).toEqual({ ":pk": "USER#OWNER", ":prefix": "CARD#" });
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ PK: "USER#OWNER", SK: "x" });
  });

  it("queries recent acquisitions on GSI1 descending", async () => {
    send.mockResolvedValueOnce({ Items: [] });
    await queryRecentAcquisitions(5);
    const input = send.mock.calls[0][0].input;
    expect(input.IndexName).toBe("GSI1");
    expect(input.ScanIndexForward).toBe(false);
    expect(input.Limit).toBe(5);
  });

  it("listOwnedCardIds counts unique card ids — duplicates never add", async () => {
    send.mockResolvedValueOnce({
      Items: [item(1, "a"), item(1, "b"), item(1, "c", { condition: "Damaged" }), item(2, "d")],
    });
    const ids = await listOwnedCardIds();
    expect(ids).toEqual(new Set([1, 2]));
    expect(ids.size).toBe(2);
  });

  it("maps stored minor units back to Money and missing fields to null", async () => {
    send.mockResolvedValueOnce({
      Items: [item(1, "a", { purchasePriceMinor: 999, purchasePriceCurrency: "ILS" }), item(2, "b")],
    });
    const [a, b] = await queryAllCopies();
    expect(a.purchasePrice).toEqual({ amountMinor: 999, currency: "ILS" });
    expect(b.purchasePrice).toBeNull();
    expect(b.printingSetCode).toBeNull();
    expect(b.purchaseId).toBeNull();
  });
});
