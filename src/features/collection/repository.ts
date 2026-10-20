import "server-only";

import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { ddb, GSI1, tableName } from "@/lib/aws/client";
import {
  CARD_COPY_PREFIX,
  cardCopyPrefix,
  cardCopySk,
  cardKeyId,
  COPIES_GSI1PK,
  copyGsi1Sk,
  nowIso,
  OWNER_PK,
} from "@/lib/aws/keys";
import type { CardCopy } from "@/types";

import { cardCopyItemSchema, type CopyInput } from "./schemas";

// Data access for CARD_COPY items (PRD §8, §16). No auth here — callers (queries.ts, actions.ts)
// run requireOwner() first. purchaseId is never written here: only the purchases feature sets it
// inside its link transaction.

function parseItems(items: Record<string, unknown>[] | undefined): CardCopy[] {
  return (items ?? []).map((item) => cardCopyItemSchema.parse(item));
}

const isConditionalCheckFailure = (error: unknown) =>
  error instanceof Error && error.name === "ConditionalCheckFailedException";

const byCreatedAt = (a: CardCopy, b: CardCopy) => a.createdAt.localeCompare(b.createdAt);

/** Every CARD_COPY item, following LastEvaluatedKey until exhausted. */
export async function queryAllCopies(): Promise<CardCopy[]> {
  const copies: CardCopy[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb().send(
      new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": OWNER_PK, ":prefix": CARD_COPY_PREFIX },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    copies.push(...parseItems(res.Items));
    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return copies;
}

/** All copies of one card, oldest first. */
export async function queryCopiesForCard(cardId: number): Promise<CardCopy[]> {
  const copies: CardCopy[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb().send(
      new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": OWNER_PK, ":prefix": cardCopyPrefix(cardId) },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    copies.push(...parseItems(res.Items));
    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return copies.sort(byCreatedAt);
}

/** Most recently acquired copies (GSI1, by acquiredAt then createdAt, descending). */
export async function queryRecentAcquisitions(limit: number): Promise<CardCopy[]> {
  const res = await ddb().send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: GSI1,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": COPIES_GSI1PK },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return parseItems(res.Items);
}

export async function getCopy(cardId: number, copyId: string): Promise<CardCopy | null> {
  const res = await ddb().send(
    new GetCommand({ TableName: tableName(), Key: { PK: OWNER_PK, SK: cardCopySk(cardId, copyId) } }),
  );
  return res.Item ? cardCopyItemSchema.parse(res.Item) : null;
}

const gsiDate = (acquiredAt: string | null, createdAt: string) => acquiredAt ?? createdAt.slice(0, 10);

/** Creates one physical copy with a fresh copyId. Never overwrites. */
export async function createCopy(card: { id: number; name: string }, input: CopyInput): Promise<CardCopy> {
  const copyId = crypto.randomUUID();
  const createdAt = nowIso();
  const cardId = Number(cardKeyId(card.id));
  const item = {
    PK: OWNER_PK,
    SK: cardCopySk(cardId, copyId),
    GSI1PK: COPIES_GSI1PK,
    GSI1SK: copyGsi1Sk(gsiDate(input.acquiredAt, createdAt), createdAt, copyId),
    entityType: "CARD_COPY" as const,
    copyId,
    cardId,
    cardName: card.name,
    printingSetCode: input.printingSetCode ?? undefined,
    printingRarity: input.printingRarity ?? undefined,
    condition: input.condition,
    purchasePriceMinor: input.purchasePrice?.amountMinor,
    purchasePriceCurrency: input.purchasePrice?.currency,
    acquiredAt: input.acquiredAt ?? undefined,
    notes: input.notes,
    createdAt,
    updatedAt: createdAt,
  };
  await ddb().send(
    new PutCommand({ TableName: tableName(), Item: item, ConditionExpression: "attribute_not_exists(PK)" }),
  );
  return cardCopyItemSchema.parse(item);
}

export type MutationResult = { ok: true } | { ok: false; error: "not_found" | "linked_to_purchase" };

/** Updates a copy's own fields. cardId and purchaseId are never changed here. */
export async function updateCopy(existing: CardCopy, input: CopyInput): Promise<MutationResult> {
  const set: string[] = ["#condition = :condition", "#notes = :notes", "#updatedAt = :updatedAt", "GSI1SK = :gsi1sk"];
  const remove: string[] = [];
  const names: Record<string, string> = { "#condition": "condition", "#notes": "notes", "#updatedAt": "updatedAt" };
  const values: Record<string, unknown> = {
    ":condition": input.condition,
    ":notes": input.notes,
    ":updatedAt": nowIso(),
    ":gsi1sk": copyGsi1Sk(gsiDate(input.acquiredAt, existing.createdAt), existing.createdAt, existing.copyId),
  };
  const setOrRemove = (attr: string, value: unknown) => {
    names[`#${attr}`] = attr;
    if (value === null || value === undefined) remove.push(`#${attr}`);
    else {
      set.push(`#${attr} = :${attr}`);
      values[`:${attr}`] = value;
    }
  };
  setOrRemove("printingSetCode", input.printingSetCode);
  setOrRemove("printingRarity", input.printingRarity);
  setOrRemove("purchasePriceMinor", input.purchasePrice?.amountMinor);
  setOrRemove("purchasePriceCurrency", input.purchasePrice?.currency);
  setOrRemove("acquiredAt", input.acquiredAt);

  try {
    await ddb().send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: OWNER_PK, SK: cardCopySk(existing.cardId, existing.copyId) },
        UpdateExpression: `SET ${set.join(", ")}${remove.length ? ` REMOVE ${remove.join(", ")}` : ""}`,
        ConditionExpression: "attribute_exists(PK)",
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    );
    return { ok: true };
  } catch (error) {
    if (isConditionalCheckFailure(error)) return { ok: false, error: "not_found" };
    throw error;
  }
}

/** Deletes a copy unless it is linked to a purchase (unlink it in Purchases first). */
export async function deleteCopy(cardId: number, copyId: string): Promise<MutationResult> {
  try {
    await ddb().send(
      new DeleteCommand({
        TableName: tableName(),
        Key: { PK: OWNER_PK, SK: cardCopySk(cardId, copyId) },
        ConditionExpression: "attribute_exists(PK) AND attribute_not_exists(purchaseId)",
      }),
    );
    return { ok: true };
  } catch (error) {
    if (isConditionalCheckFailure(error)) {
      const current = await getCopy(cardId, copyId);
      return { ok: false, error: current ? "linked_to_purchase" : "not_found" };
    }
    throw error;
  }
}
