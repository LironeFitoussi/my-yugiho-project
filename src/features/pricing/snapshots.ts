import "server-only";

import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

import { ddb, tableName } from "@/lib/aws/client";
import { dateSk, nowIso, pricePk, todayUtc } from "@/lib/aws/keys";
import type { Money } from "@/lib/money";
import type { Card, CatalogPrice } from "@/types";

const MAX_IN_FLIGHT = 5;

/**
 * Writes one PRICE_SNAPSHOT per card with a market price, at most once per UTC day
 * (conditional Put; an existing snapshot for today is left untouched). ≤ 5 writes in flight.
 */
// Per-process memo of `${date}#${cardId}` already snapshotted (written or found existing), so only the
// first valuation of the day touches DynamoDB; the conditional Put still guards across restarts.
const snapshotted = new Set<string>();
let memoDate = "";

export async function recordPriceSnapshots(cards: Card[]): Promise<{ written: number; skipped: number }> {
  const today = todayUtc();
  if (memoDate !== today) {
    snapshotted.clear();
    memoDate = today;
  }
  const priced = cards.flatMap((card) =>
    card.marketPrice && card.marketPrice.amountMinor > 0 && !snapshotted.has(`${today}#${card.id}`)
      ? [{ id: card.id, price: card.marketPrice }]
      : [],
  );
  const SK = dateSk(today);
  const client = ddb();
  const TableName = tableName();
  let written = 0;
  let skipped = 0;
  let next = 0;

  async function write(id: number, price: CatalogPrice) {
    const now = nowIso();
    try {
      await client.send(
        new PutCommand({
          TableName,
          Item: {
            PK: pricePk(id),
            SK,
            entityType: "PRICE_SNAPSHOT",
            cardId: id,
            marketPriceMinor: price.amountMinor,
            currency: price.currency,
            source: price.source,
            pricedAt: now,
            createdAt: now,
            updatedAt: now,
          },
          ConditionExpression: "attribute_not_exists(PK)",
        }),
      );
      written += 1;
      snapshotted.add(`${today}#${id}`);
    } catch (error) {
      if ((error as { name?: string }).name === "ConditionalCheckFailedException") {
        skipped += 1;
        snapshotted.add(`${today}#${id}`);
      } else throw error;
    }
  }

  async function worker() {
    while (next < priced.length) {
      const { id, price } = priced[next++];
      await write(id, price);
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_IN_FLIGHT, priced.length) }, worker));
  return { written, skipped };
}

const snapshotSchema = z.object({
  SK: z.string().startsWith("DATE#"),
  marketPriceMinor: z.number().int().positive(),
  currency: z.literal("USD"),
  source: z.string(),
  pricedAt: z.string(),
});

export type PriceSnapshot = { date: string; price: Money; source: string; pricedAt: string };

/** Price history for a card, most recent first. */
export async function getPriceHistory(cardId: number, limit = 30): Promise<PriceSnapshot[]> {
  const { Items = [] } = await ddb().send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": pricePk(cardId) },
      ScanIndexForward: false,
      Limit: Math.max(1, Math.min(limit, 366)),
    }),
  );
  return Items.flatMap((item) => {
    const parsed = snapshotSchema.safeParse(item);
    if (!parsed.success) return [];
    const s = parsed.data;
    return [
      {
        date: s.SK.slice("DATE#".length),
        price: { amountMinor: s.marketPriceMinor, currency: s.currency },
        source: s.source,
        pricedAt: s.pricedAt,
      },
    ];
  });
}
