import "server-only";

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  type TransactWriteCommandInput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

import { ddb, GSI1, tableName } from "@/lib/aws/client";
import {
  cardCopySk,
  nowIso,
  OWNER_PK,
  productSk,
  purchaseCopyItemSk,
  purchaseGsi1Sk,
  purchaseItemPrefix,
  purchaseMiscItemSk,
  purchaseProductItemSk,
  PURCHASES_GSI1PK,
  purchaseSk,
} from "@/lib/aws/keys";
import { decodeCursor, encodeCursor, type Page } from "@/lib/aws/pagination";
import { currencySchema } from "@/lib/money";
import type { Purchase, PurchaseItem, PurchaseItemKind } from "@/types";

import {
  type NewPurchaseItem,
  type PurchaseFormInput,
  purchaseItemRecordSchema,
  purchaseRecordSchema,
} from "./schemas";

/** Expected, user-facing failure (shown verbatim in the UI). */
export class PurchaseError extends Error {
  override name = "PurchaseError";
}

/** A purchase line as shown in the UI. `cardId` is set for COPY lines (to link to the card page). */
export type PurchaseItemView = PurchaseItem & { cardId: number | null };

export type PurchaseWithItems = { purchase: Purchase; items: PurchaseItemView[] };

type TransactItem = NonNullable<TransactWriteCommandInput["TransactItems"]>[number];

// ---------- mapping ----------

export function toPurchase(item: Record<string, unknown>): Purchase {
  const r = purchaseRecordSchema.parse(item);
  return { ...r, notes: r.notes ?? "" };
}

export function toPurchaseItem(item: Record<string, unknown>): PurchaseItemView {
  const r = purchaseItemRecordSchema.parse(item);
  const currency = currencySchema.parse(item.currency);
  return {
    purchaseId: r.purchaseId,
    kind: r.kind,
    refId: r.refId,
    cardId: r.cardId ?? null,
    description: r.description,
    amount: { amountMinor: r.amountMinor, currency },
    createdAt: r.createdAt,
  };
}

export function itemSk(purchaseId: string, kind: PurchaseItemKind, refId: string): string {
  if (kind === "COPY") return purchaseCopyItemSk(purchaseId, refId);
  if (kind === "PRODUCT") return purchaseProductItemSk(purchaseId, refId);
  return purchaseMiscItemSk(purchaseId, refId);
}

/**
 * Maps a TransactionCanceledException to a friendly PurchaseError using the per-item
 * messages (same order as TransactItems). Re-throws anything else unchanged.
 */
export function mapTransactionError(err: unknown, messages: (string | null)[]): never {
  if (err instanceof Error && err.name === "TransactionCanceledException") {
    const reasons = (err as Error & { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? [];
    for (let i = 0; i < reasons.length; i++) {
      if (reasons[i]?.Code === "ConditionalCheckFailed" && messages[i]) throw new PurchaseError(messages[i]!);
    }
    if (reasons.some((r) => r?.Code === "TransactionConflict")) {
      throw new PurchaseError("Another change was in progress. Please try again.");
    }
    throw new PurchaseError("The change could not be saved. Please reload and try again.");
  }
  if (err instanceof Error && err.name === "IdempotentParameterMismatchException") {
    throw new PurchaseError("This request was already submitted with different values. Please reload and try again.");
  }
  throw err;
}

// ---------- reads ----------

export async function getPurchaseHeader(purchaseId: string): Promise<Purchase | null> {
  const res = await ddb().send(
    new GetCommand({ TableName: tableName(), Key: { PK: OWNER_PK, SK: purchaseSk(purchaseId) } }),
  );
  return res.Item ? toPurchase(res.Item) : null;
}

/** One purchase + its items: Query begins_with(SK, PURCHASE#<id>) — the header sorts first. */
export async function queryPurchaseWithItems(purchaseId: string): Promise<PurchaseWithItems | null> {
  const headerSk = purchaseSk(purchaseId);
  const itemPrefix = purchaseItemPrefix(purchaseId);
  const rows: Record<string, unknown>[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb().send(
      new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": OWNER_PK, ":prefix": headerSk },
        ExclusiveStartKey: startKey,
      }),
    );
    rows.push(...(res.Items ?? []));
    startKey = res.LastEvaluatedKey;
  } while (startKey);

  const header = rows.find((r) => r.SK === headerSk);
  if (!header) return null;
  const items = rows
    .filter((r) => typeof r.SK === "string" && r.SK.startsWith(itemPrefix))
    .map(toPurchaseItem)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { purchase: toPurchase(header), items };
}

/** Purchases newest first (GSI1 desc), one page. */
export async function queryPurchasesPage(cursor?: string | null, limit = 25): Promise<Page<Purchase>> {
  const res = await ddb().send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: GSI1,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": PURCHASES_GSI1PK },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: decodeCursor(cursor, { attr: "GSI1PK", value: PURCHASES_GSI1PK }),
    }),
  );
  return { items: (res.Items ?? []).map(toPurchase), cursor: encodeCursor(res.LastEvaluatedKey) };
}

export async function queryAllPurchases(): Promise<Purchase[]> {
  const all: Purchase[] = [];
  let cursor: string | null = null;
  do {
    const page = await queryPurchasesPage(cursor, 100);
    all.push(...page.items);
    cursor = page.cursor;
  } while (cursor);
  return all;
}

// ---------- header writes ----------

export async function createPurchase(input: PurchaseFormInput): Promise<Purchase> {
  const purchaseId = crypto.randomUUID();
  const now = nowIso();
  const item = {
    PK: OWNER_PK,
    SK: purchaseSk(purchaseId),
    GSI1PK: PURCHASES_GSI1PK,
    GSI1SK: purchaseGsi1Sk(input.date, purchaseId),
    entityType: "PURCHASE",
    purchaseId,
    date: input.date,
    seller: input.seller,
    currency: input.currency,
    subtotalMinor: 0, // maintained only by item transactions
    shippingMinor: input.shippingMinor,
    itemCount: 0,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  await ddb().send(
    new PutCommand({ TableName: tableName(), Item: item, ConditionExpression: "attribute_not_exists(PK)" }),
  );
  return toPurchase(item);
}

/**
 * Edits the header (date, seller, shipping, notes). Never touches subtotalMinor / itemCount.
 * The currency may only change while the purchase has no items.
 */
export async function updatePurchase(purchaseId: string, input: PurchaseFormInput): Promise<void> {
  try {
    await ddb().send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: OWNER_PK, SK: purchaseSk(purchaseId) },
        UpdateExpression:
          "SET #date = :date, seller = :seller, currency = :cur, shippingMinor = :ship, notes = :notes, " +
          "updatedAt = :now, GSI1SK = :gsi1sk",
        ConditionExpression: "attribute_exists(PK) AND (currency = :cur OR itemCount = :zero)",
        ExpressionAttributeNames: { "#date": "date" },
        ExpressionAttributeValues: {
          ":date": input.date,
          ":seller": input.seller,
          ":cur": input.currency,
          ":ship": input.shippingMinor,
          ":notes": input.notes,
          ":now": nowIso(),
          ":gsi1sk": purchaseGsi1Sk(input.date, purchaseId),
          ":zero": 0,
        },
        ReturnValuesOnConditionCheckFailure: "ALL_OLD",
      }),
    );
  } catch (err) {
    if (err instanceof Error && err.name === "ConditionalCheckFailedException") {
      const existed = Boolean((err as Error & { Item?: unknown }).Item);
      throw new PurchaseError(
        existed
          ? "The currency can't change while the purchase has items. Remove its items first."
          : "This purchase no longer exists.",
      );
    }
    throw err;
  }
}

/** Deletes a purchase only when it has no items (itemCount = 0). */
export async function deletePurchase(purchaseId: string): Promise<void> {
  try {
    await ddb().send(
      new DeleteCommand({
        TableName: tableName(),
        Key: { PK: OWNER_PK, SK: purchaseSk(purchaseId) },
        ConditionExpression: "attribute_exists(PK) AND itemCount = :zero",
        ExpressionAttributeValues: { ":zero": 0 },
      }),
    );
  } catch (err) {
    if (err instanceof Error && err.name === "ConditionalCheckFailedException") {
      throw new PurchaseError("Only an empty purchase can be deleted. Remove its items first.");
    }
    throw err;
  }
}

// ---------- item transactions ----------

const copyRefSchema = z.object({
  cardName: z.string(),
  printingSetCode: z.string().nullable().optional(),
  purchaseId: z.string().nullable().optional(),
});
const productRefSchema = z.object({ name: z.string(), purchaseId: z.string().nullable().optional() });

async function getRow(sk: string): Promise<Record<string, unknown> | undefined> {
  const res = await ddb().send(new GetCommand({ TableName: tableName(), Key: { PK: OWNER_PK, SK: sk } }));
  return res.Item;
}

/**
 * Links a copy/product (or records a misc line) to a purchase in ONE transaction:
 * 1. Put the PURCHASE_ITEM (deterministic SK for copy/product → can't be added twice)
 * 2. Mark the copy/product with purchaseId — only if it isn't in any purchase yet (skipped for MISC)
 * 3. ADD the amount to the header subtotal and itemCount — only if the currency still matches
 * Never creates card copies: step 2 only sets purchaseId / purchaseItemSk on an existing copy.
 */
export async function addPurchaseItem(
  purchaseId: string,
  item: NewPurchaseItem,
  requestToken: string,
): Promise<void> {
  const header = await getPurchaseHeader(purchaseId);
  if (!header) throw new PurchaseError("This purchase no longer exists.");

  const now = nowIso();
  let sk: string;
  let refId: string;
  let description: string;
  let cardId: number | null = null;
  let refKey: { PK: string; SK: string } | null = null;
  let alreadyLinkedMessage: string | null = null;

  if (item.kind === "COPY") {
    refId = item.copyId;
    cardId = item.cardId;
    sk = purchaseCopyItemSk(purchaseId, item.copyId);
    refKey = { PK: OWNER_PK, SK: cardCopySk(item.cardId, item.copyId) };
    const row = await getRow(refKey.SK);
    if (!row) throw new PurchaseError("That copy no longer exists.");
    const copy = copyRefSchema.parse(row);
    if (copy.purchaseId) throw new PurchaseError("This copy is already part of another purchase.");
    description = copy.printingSetCode ? `${copy.cardName} (${copy.printingSetCode})` : copy.cardName;
    alreadyLinkedMessage = "This copy is already part of another purchase.";
  } else if (item.kind === "PRODUCT") {
    refId = item.productId;
    sk = purchaseProductItemSk(purchaseId, item.productId);
    refKey = { PK: OWNER_PK, SK: productSk(item.productId) };
    const row = await getRow(refKey.SK);
    if (!row) throw new PurchaseError("That product no longer exists.");
    const product = productRefSchema.parse(row);
    if (product.purchaseId) throw new PurchaseError("This product is already part of another purchase.");
    description = product.name;
    alreadyLinkedMessage = "This product is already part of another purchase.";
  } else {
    refId = item.itemId;
    sk = purchaseMiscItemSk(purchaseId, item.itemId);
    description = item.description;
  }

  const transactItems: TransactItem[] = [];
  const messages: (string | null)[] = [];

  transactItems.push({
    Put: {
      TableName: tableName(),
      Item: {
        PK: OWNER_PK,
        SK: sk,
        entityType: "PURCHASE_ITEM",
        purchaseId,
        kind: item.kind,
        refId,
        ...(cardId !== null ? { cardId } : {}),
        description,
        amountMinor: item.amountMinor,
        currency: header.currency,
        createdAt: now,
        updatedAt: now,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    },
  });
  messages.push("This item is already part of this purchase.");

  if (refKey) {
    transactItems.push({
      Update: {
        TableName: tableName(),
        Key: refKey,
        UpdateExpression: "SET purchaseId = :pid, purchaseItemSk = :isk, updatedAt = :now",
        ConditionExpression: "attribute_exists(PK) AND attribute_not_exists(purchaseId)",
        ExpressionAttributeValues: { ":pid": purchaseId, ":isk": sk, ":now": now },
      },
    });
    messages.push(alreadyLinkedMessage);
  }

  transactItems.push({
    Update: {
      TableName: tableName(),
      Key: { PK: OWNER_PK, SK: purchaseSk(purchaseId) },
      UpdateExpression: "ADD subtotalMinor :amt, itemCount :one SET updatedAt = :now",
      ConditionExpression: "attribute_exists(PK) AND currency = :cur",
      ExpressionAttributeValues: { ":amt": item.amountMinor, ":one": 1, ":now": now, ":cur": header.currency },
    },
  });
  messages.push("The purchase changed (deleted or currency edited). Reload and try again.");

  try {
    await ddb().send(new TransactWriteCommand({ TransactItems: transactItems, ClientRequestToken: requestToken }));
  } catch (err) {
    mapTransactionError(err, messages);
  }
}

/**
 * Removes a line from a purchase in ONE transaction: delete the item, clear the
 * copy/product link (only if it still points at this purchase), and subtract the amount.
 * If the referenced copy/product was deleted meanwhile, a ConditionCheck asserts it is gone.
 */
export async function removePurchaseItem(
  purchaseId: string,
  kind: PurchaseItemKind,
  refId: string,
  requestToken: string,
): Promise<void> {
  const sk = itemSk(purchaseId, kind, refId);
  const row = await getRow(sk);
  if (!row) throw new PurchaseError("This item was already removed.");
  const item = toPurchaseItem(row);
  const now = nowIso();

  let refKey: { PK: string; SK: string } | null = null;
  if (kind === "COPY") {
    if (item.cardId === null) throw new PurchaseError("This item is missing its card reference.");
    refKey = { PK: OWNER_PK, SK: cardCopySk(item.cardId, refId) };
  } else if (kind === "PRODUCT") {
    refKey = { PK: OWNER_PK, SK: productSk(refId) };
  }

  const transactItems: TransactItem[] = [
    {
      Delete: {
        TableName: tableName(),
        Key: { PK: OWNER_PK, SK: sk },
        ConditionExpression: "attribute_exists(PK) AND amountMinor = :amt",
        ExpressionAttributeValues: { ":amt": item.amount.amountMinor },
      },
    },
  ];
  const messages: (string | null)[] = ["This item changed or was already removed. Reload and try again."];

  if (refKey) {
    const refExists = Boolean(await getRow(refKey.SK));
    transactItems.push(
      refExists
        ? {
            Update: {
              TableName: tableName(),
              Key: refKey,
              UpdateExpression: "REMOVE purchaseId, purchaseItemSk SET updatedAt = :now",
              ConditionExpression: "purchaseId = :pid",
              ExpressionAttributeValues: { ":pid": purchaseId, ":now": now },
            },
          }
        : {
            ConditionCheck: {
              TableName: tableName(),
              Key: refKey,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
    );
    messages.push(
      kind === "COPY"
        ? "This copy is linked to a different purchase. Reload and try again."
        : "This product is linked to a different purchase. Reload and try again.",
    );
  }

  transactItems.push({
    Update: {
      TableName: tableName(),
      Key: { PK: OWNER_PK, SK: purchaseSk(purchaseId) },
      UpdateExpression: "ADD subtotalMinor :neg, itemCount :minusOne SET updatedAt = :now",
      ConditionExpression: "attribute_exists(PK)",
      ExpressionAttributeValues: { ":neg": -item.amount.amountMinor, ":minusOne": -1, ":now": now },
    },
  });
  messages.push("This purchase no longer exists.");

  try {
    await ddb().send(new TransactWriteCommand({ TransactItems: transactItems, ClientRequestToken: requestToken }));
  } catch (err) {
    mapTransactionError(err, messages);
  }
}
