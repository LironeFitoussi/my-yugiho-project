import "server-only";

import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { ddb, tableName } from "@/lib/aws/client";
import { cardKeyId, nowIso, OWNER_PK, WISHLIST_PREFIX, wishlistCardSk, wishlistProductSk } from "@/lib/aws/keys";
import type { WishlistItem } from "@/types";

import { type ProductWishInput, wishlistRecordSchema } from "./schemas";

// Data access for WISHLIST items (PRD §13, §16). No auth here — callers (queries.ts, actions.ts)
// run requireOwner() first. Wishing for a product never touches products or the collection.

export type WishMutationResult = { ok: true } | { ok: false; error: "exists" | "not_found" };

const isConditionalCheckFailure = (error: unknown) =>
  error instanceof Error && error.name === "ConditionalCheckFailedException";

function parseItems(items: Record<string, unknown>[] | undefined): WishlistItem[] {
  return (items ?? []).flatMap((item) => {
    const parsed = wishlistRecordSchema.safeParse(item);
    if (!parsed.success) {
      console.error("[wishlist] skipping malformed item", item.SK);
      return [];
    }
    return [parsed.data];
  });
}

/** Every wishlist item (cards and products), following LastEvaluatedKey. */
export async function queryWishlist(): Promise<WishlistItem[]> {
  const items: WishlistItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb().send(
      new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": OWNER_PK, ":prefix": WISHLIST_PREFIX },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    items.push(...parseItems(res.Items));
    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return items;
}

export async function getCardWishRecord(cardId: number): Promise<Extract<WishlistItem, { kind: "CARD" }> | null> {
  const res = await ddb().send(
    new GetCommand({ TableName: tableName(), Key: { PK: OWNER_PK, SK: wishlistCardSk(cardId) } }),
  );
  if (!res.Item) return null;
  const [item] = parseItems([res.Item]);
  return item?.kind === "CARD" ? item : null;
}

/** One entry per card: conditional Put fails with "exists" when the card is already wished for. */
export async function putCardWish(
  card: { id: number; name: string },
  input: { desiredQuantity: number; notes: string },
): Promise<WishMutationResult> {
  const now = nowIso();
  const cardId = Number(cardKeyId(card.id));
  try {
    await ddb().send(
      new PutCommand({
        TableName: tableName(),
        Item: {
          PK: OWNER_PK,
          SK: wishlistCardSk(cardId),
          entityType: "WISHLIST",
          wishKind: "CARD",
          cardId,
          cardName: card.name,
          desiredQuantity: input.desiredQuantity,
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
    return { ok: true };
  } catch (error) {
    if (isConditionalCheckFailure(error)) return { ok: false, error: "exists" };
    throw error;
  }
}

export async function updateCardWish(
  cardId: number,
  input: { desiredQuantity: number; notes: string },
): Promise<WishMutationResult> {
  try {
    await ddb().send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: OWNER_PK, SK: wishlistCardSk(cardId) },
        UpdateExpression: "SET desiredQuantity = :q, notes = :n, updatedAt = :u",
        ConditionExpression: "attribute_exists(PK)",
        ExpressionAttributeValues: { ":q": input.desiredQuantity, ":n": input.notes, ":u": nowIso() },
      }),
    );
    return { ok: true };
  } catch (error) {
    if (isConditionalCheckFailure(error)) return { ok: false, error: "not_found" };
    throw error;
  }
}

/** Creates a product wish. It starts unfulfilled unless the user explicitly picked a product. */
export async function createProductWish(input: ProductWishInput): Promise<string> {
  const wishId = crypto.randomUUID();
  const now = nowIso();
  await ddb().send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        PK: OWNER_PK,
        SK: wishlistProductSk(wishId),
        entityType: "WISHLIST",
        wishKind: "PRODUCT",
        wishId,
        name: input.name,
        category: input.category,
        setCode: input.setCode ?? undefined,
        fulfilledByProductId: input.fulfilledByProductId ?? undefined,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
  return wishId;
}

export async function updateProductWish(wishId: string, input: ProductWishInput): Promise<WishMutationResult> {
  const set = ["#name = :name", "category = :category", "notes = :notes", "updatedAt = :u"];
  const remove: string[] = [];
  const values: Record<string, unknown> = {
    ":name": input.name,
    ":category": input.category,
    ":notes": input.notes,
    ":u": nowIso(),
  };
  if (input.setCode) {
    set.push("setCode = :setCode");
    values[":setCode"] = input.setCode;
  } else remove.push("setCode");
  if (input.fulfilledByProductId) {
    set.push("fulfilledByProductId = :fp");
    values[":fp"] = input.fulfilledByProductId;
  } else remove.push("fulfilledByProductId");

  try {
    await ddb().send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: OWNER_PK, SK: wishlistProductSk(wishId) },
        UpdateExpression: `SET ${set.join(", ")}${remove.length ? ` REMOVE ${remove.join(", ")}` : ""}`,
        ConditionExpression: "attribute_exists(PK)",
        ExpressionAttributeNames: { "#name": "name" },
        ExpressionAttributeValues: values,
      }),
    );
    return { ok: true };
  } catch (error) {
    if (isConditionalCheckFailure(error)) return { ok: false, error: "not_found" };
    throw error;
  }
}

export async function deleteWish(sk: string): Promise<WishMutationResult> {
  if (!sk.startsWith(WISHLIST_PREFIX)) throw new Error("Not a wishlist key");
  try {
    await ddb().send(
      new DeleteCommand({
        TableName: tableName(),
        Key: { PK: OWNER_PK, SK: sk },
        ConditionExpression: "attribute_exists(PK)",
      }),
    );
    return { ok: true };
  } catch (error) {
    if (isConditionalCheckFailure(error)) return { ok: false, error: "not_found" };
    throw error;
  }
}
