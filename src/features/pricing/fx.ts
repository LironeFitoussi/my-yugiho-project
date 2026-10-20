import "server-only";

import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { cache } from "react";
import { z } from "zod";

import { ddb, tableName } from "@/lib/aws/client";
import { dateSk, fxPk, nowIso, todayUtc } from "@/lib/aws/keys";
import { FRANKFURTER_SOURCE, fetchLatestRate } from "@/lib/fx/frankfurter";
import { currencySchema, type FxRate } from "@/lib/money";

const fxItemSchema = z.object({
  base: currencySchema,
  quote: currencySchema,
  rate: z.string().regex(/^\d+(\.\d+)?$/),
  rateDate: z.string(),
  fetchedAt: z.string(),
  source: z.string(),
});

function toFxRate(item: unknown): FxRate | null {
  const parsed = fxItemSchema.safeParse(item);
  return parsed.success ? parsed.data : null;
}

/**
 * Uncached implementation of getUsdIlsRate (exported for tests).
 * 1. today's stored FX_RATE item → 2. fetch Frankfurter and store it →
 * 3. on provider failure, the latest stored rate (it carries its own fetchedAt, so the UI can
 *    show staleness) → 4. null. Never invents a rate.
 */
export async function loadUsdIlsRate(): Promise<FxRate | null> {
  const PK = fxPk("USD", "ILS");
  const SK = dateSk(todayUtc());
  const client = ddb();
  const TableName = tableName();

  try {
    const { Item } = await client.send(new GetCommand({ TableName, Key: { PK, SK } }));
    const cached = toFxRate(Item);
    if (cached) return cached;
  } catch (error) {
    console.error("[fx] reading cached rate failed", error);
  }

  try {
    const provider = await fetchLatestRate("USD", "ILS");
    const now = nowIso();
    const rate: FxRate = {
      base: "USD",
      quote: "ILS",
      rate: provider.rate,
      rateDate: provider.rateDate,
      fetchedAt: now,
      source: FRANKFURTER_SOURCE,
    };
    try {
      await client.send(
        new PutCommand({
          TableName,
          Item: { PK, SK, entityType: "FX_RATE", ...rate, createdAt: now, updatedAt: now },
          ConditionExpression: "attribute_not_exists(PK)",
        }),
      );
    } catch (error) {
      // A concurrent request may have stored today's rate first; the fetched rate is still valid.
      if ((error as { name?: string }).name !== "ConditionalCheckFailedException") {
        console.error("[fx] storing rate failed", error);
      }
    }
    return rate;
  } catch (error) {
    console.error("[fx] provider failed, falling back to latest stored rate", error);
  }

  try {
    const { Items } = await client.send(
      new QueryCommand({
        TableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": PK },
        ScanIndexForward: false,
        Limit: 1,
      }),
    );
    return toFxRate(Items?.[0]);
  } catch (error) {
    console.error("[fx] reading latest stored rate failed", error);
    return null;
  }
}

/** Latest USD→ILS rate (cached daily in DynamoDB), or null when none is available. Server-only. */
export const getUsdIlsRate: () => Promise<FxRate | null> = cache(loadUsdIlsRate);
