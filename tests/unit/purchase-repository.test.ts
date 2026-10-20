import { GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("@/lib/aws/client", () => ({
  ddb: () => ({ send }),
  tableName: () => "test-table",
  GSI1: "GSI1",
}));
vi.mock("@/lib/auth", () => ({ requireOwner: vi.fn(async () => ({ sub: "owner" })) }));

const { addPurchaseItem, deletePurchase, mapTransactionError, PurchaseError, removePurchaseItem } = await import(
  "@/features/purchases/repository"
);

const PID = "11111111-1111-4111-8111-111111111111";
const COPY = "22222222-2222-4222-8222-222222222222";
const PROD = "33333333-3333-4333-8333-333333333333";
const TOKEN = "44444444-4444-4444-8444-444444444444";

const header = {
  PK: "USER#OWNER",
  SK: `PURCHASE#${PID}`,
  purchaseId: PID,
  date: "2026-10-01",
  seller: "Shop",
  currency: "USD",
  subtotalMinor: 0,
  shippingMinor: 500,
  itemCount: 0,
  notes: "",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};


/** Routes GetCommand by SK to the given rows; captures everything else. */
function mockTable(rows: Record<string, Record<string, unknown>>, transactImpl?: () => unknown) {
  send.mockImplementation(async (cmd: unknown) => {
    if (cmd instanceof GetCommand) return { Item: rows[cmd.input.Key!.SK as string] };
    if (cmd instanceof TransactWriteCommand) return transactImpl ? transactImpl() : {};
    throw new Error("unexpected command");
  });
}

function lastTransact() {
  const call = send.mock.calls.map((c) => c[0]).find((c) => c instanceof TransactWriteCommand);
  if (!call) throw new Error("no TransactWriteCommand sent");
  return (call as TransactWriteCommand).input;
}

function cancelled(codes: string[]) {
  return Object.assign(new Error("Transaction cancelled"), {
    name: "TransactionCanceledException",
    CancellationReasons: codes.map((Code) => ({ Code })),
  });
}

beforeEach(() => {
  send.mockReset();
});

describe("addPurchaseItem — link a copy", () => {
  it("sends one idempotent transaction: put item, link copy, bump header", async () => {
    mockTable({
      [`PURCHASE#${PID}`]: header,
      [`CARD#46986414#COPY#${COPY}`]: { cardName: "Dark Magician", printingSetCode: "LOB-005", purchaseId: null },
    });
    await addPurchaseItem(PID, { kind: "COPY", cardId: 46986414, copyId: COPY, amountMinor: 1250 }, TOKEN);

    const input = lastTransact();
    expect(input.ClientRequestToken).toBe(TOKEN);
    const [put, linkCopy, bump] = input.TransactItems!;

    expect(put.Put!.Item).toMatchObject({
      PK: "USER#OWNER",
      SK: `PURCHASE#${PID}#ITEM#COPY#${COPY}`,
      entityType: "PURCHASE_ITEM",
      kind: "COPY",
      refId: COPY,
      cardId: 46986414,
      amountMinor: 1250,
      currency: "USD",
      description: "Dark Magician (LOB-005)",
    });
    expect(put.Put!.ConditionExpression).toBe("attribute_not_exists(PK)");

    // Only sets link attributes on an existing copy — never creates a copy.
    expect(linkCopy.Update!.Key).toEqual({ PK: "USER#OWNER", SK: `CARD#46986414#COPY#${COPY}` });
    expect(linkCopy.Update!.UpdateExpression).toContain("SET purchaseId = :pid, purchaseItemSk = :isk");
    expect(linkCopy.Update!.ConditionExpression).toBe("attribute_exists(PK) AND attribute_not_exists(purchaseId)");
    expect(linkCopy.Update!.ExpressionAttributeValues).toMatchObject({
      ":pid": PID,
      ":isk": `PURCHASE#${PID}#ITEM#COPY#${COPY}`,
    });

    expect(bump.Update!.Key).toEqual({ PK: "USER#OWNER", SK: `PURCHASE#${PID}` });
    expect(bump.Update!.UpdateExpression).toContain("ADD subtotalMinor :amt, itemCount :one");
    expect(bump.Update!.ConditionExpression).toBe("attribute_exists(PK) AND currency = :cur");
    expect(bump.Update!.ExpressionAttributeValues).toMatchObject({ ":amt": 1250, ":one": 1, ":cur": "USD" });

    // No Put of a CARD_COPY anywhere.
    for (const t of input.TransactItems!) {
      expect(String(t.Put?.Item?.SK ?? "")).not.toMatch(/^CARD#/);
    }
  });

  it("maps a failed copy condition to a friendly 'already part of another purchase' error", async () => {
    mockTable(
      {
        [`PURCHASE#${PID}`]: header,
        [`CARD#46986414#COPY#${COPY}`]: { cardName: "Dark Magician", purchaseId: null },
      },
      () => {
        throw cancelled(["None", "ConditionalCheckFailed", "None"]);
      },
    );
    await expect(
      addPurchaseItem(PID, { kind: "COPY", cardId: 46986414, copyId: COPY, amountMinor: 100 }, TOKEN),
    ).rejects.toThrow("This copy is already part of another purchase.");
  });

  it("rejects up-front when the copy is already linked", async () => {
    mockTable({
      [`PURCHASE#${PID}`]: header,
      [`CARD#46986414#COPY#${COPY}`]: { cardName: "Dark Magician", purchaseId: "other" },
    });
    await expect(
      addPurchaseItem(PID, { kind: "COPY", cardId: 46986414, copyId: COPY, amountMinor: 100 }, TOKEN),
    ).rejects.toBeInstanceOf(PurchaseError);
    expect(send.mock.calls.some((c) => c[0] instanceof TransactWriteCommand)).toBe(false);
  });
});

describe("addPurchaseItem — misc line", () => {
  it("skips the link step (two items: put + header)", async () => {
    mockTable({ [`PURCHASE#${PID}`]: header });
    await addPurchaseItem(PID, { kind: "MISC", itemId: TOKEN, description: "Lot of commons", amountMinor: 700 }, TOKEN);
    const items = lastTransact().TransactItems!;
    expect(items).toHaveLength(2);
    expect(items[0].Put!.Item!.SK).toBe(`PURCHASE#${PID}#ITEM#MISC#${TOKEN}`);
    expect(items[1].Update!.ExpressionAttributeValues).toMatchObject({ ":amt": 700 });
  });

  it("maps a header currency mismatch to a friendly error", async () => {
    mockTable({ [`PURCHASE#${PID}`]: header }, () => {
      throw cancelled(["None", "ConditionalCheckFailed"]);
    });
    await expect(
      addPurchaseItem(PID, { kind: "MISC", itemId: TOKEN, description: "Fee", amountMinor: 1 }, TOKEN),
    ).rejects.toThrow(/purchase changed/);
  });
});

describe("removePurchaseItem", () => {
  it("deletes the item, unlinks the product only if it points here, and subtracts the amount", async () => {
    mockTable({
      [`PURCHASE#${PID}#ITEM#PRODUCT#${PROD}`]: {
        purchaseId: PID,
        kind: "PRODUCT",
        refId: PROD,
        description: "Starter Deck Yugi",
        amountMinor: 999,
        currency: "USD",
        createdAt: "2026-10-01T00:00:00.000Z",
      },
      [`PRODUCT#${PROD}`]: { name: "Starter Deck Yugi", purchaseId: PID },
    });
    await removePurchaseItem(PID, "PRODUCT", PROD, TOKEN);

    const [del, unlink, bump] = lastTransact().TransactItems!;
    expect(del.Delete!.Key).toEqual({ PK: "USER#OWNER", SK: `PURCHASE#${PID}#ITEM#PRODUCT#${PROD}` });
    expect(del.Delete!.ConditionExpression).toContain("attribute_exists(PK)");
    expect(unlink.Update!.Key).toEqual({ PK: "USER#OWNER", SK: `PRODUCT#${PROD}` });
    expect(unlink.Update!.UpdateExpression).toContain("REMOVE purchaseId, purchaseItemSk");
    expect(unlink.Update!.ConditionExpression).toBe("purchaseId = :pid");
    expect(bump.Update!.ExpressionAttributeValues).toMatchObject({ ":neg": -999, ":minusOne": -1 });
  });

  it("uses a ConditionCheck instead of an update when the copy was deleted", async () => {
    mockTable({
      [`PURCHASE#${PID}#ITEM#COPY#${COPY}`]: {
        purchaseId: PID,
        kind: "COPY",
        refId: COPY,
        cardId: 46986414,
        description: "Dark Magician",
        amountMinor: 100,
        currency: "USD",
        createdAt: "2026-10-01T00:00:00.000Z",
      },
    });
    await removePurchaseItem(PID, "COPY", COPY, TOKEN);
    const [, check] = lastTransact().TransactItems!;
    expect(check.ConditionCheck!.Key).toEqual({ PK: "USER#OWNER", SK: `CARD#46986414#COPY#${COPY}` });
    expect(check.ConditionCheck!.ConditionExpression).toBe("attribute_not_exists(PK)");
  });

  it("throws a friendly error when the item is already gone", async () => {
    mockTable({});
    await expect(removePurchaseItem(PID, "MISC", TOKEN, TOKEN)).rejects.toThrow("This item was already removed.");
  });
});

describe("deletePurchase", () => {
  it("only deletes empty purchases", async () => {
    send.mockResolvedValueOnce({});
    await deletePurchase(PID);
    expect(send.mock.calls[0][0].input).toMatchObject({
      ConditionExpression: "attribute_exists(PK) AND itemCount = :zero",
      ExpressionAttributeValues: { ":zero": 0 },
    });
  });

  it("maps the failed condition to a friendly error", async () => {
    send.mockRejectedValueOnce(Object.assign(new Error("x"), { name: "ConditionalCheckFailedException" }));
    await expect(deletePurchase(PID)).rejects.toThrow(/Only an empty purchase/);
  });
});

describe("mapTransactionError", () => {
  it("reports conflicts as retryable and rethrows unknown errors", () => {
    expect(() => mapTransactionError(cancelled(["TransactionConflict"]), [null])).toThrow(/try again/);
    const boom = new Error("network");
    expect(() => mapTransactionError(boom, [])).toThrow(boom);
  });
});
