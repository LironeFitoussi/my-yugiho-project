import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { connection } from "next/server";

import { ddb, tableName } from "@/lib/aws/client";

// Public health check for Render. Reports only up/down — no table details or errors.
// The DB probe result is cached briefly so unauthenticated traffic can't flood DynamoDB.
const CACHE_MS = 15_000;
let last: { ok: boolean; at: number } | undefined;

async function probe(): Promise<boolean> {
  try {
    const result = await ddb().send(new DescribeTableCommand({ TableName: tableName() }));
    return result.Table?.TableStatus === "ACTIVE";
  } catch (error) {
    // Log only the error class server-side (e.g. ResourceNotFoundException, CredentialsProviderError).
    console.error("[health] DynamoDB check failed:", error instanceof Error ? error.name : "unknown");
    return false;
  }
}

export async function GET() {
  await connection();
  const now = Date.now();
  if (!last || now - last.at > CACHE_MS) last = { ok: await probe(), at: now };
  const { ok } = last;
  return Response.json({ status: ok ? "ok" : "error", db: ok }, { status: ok ? 200 : 503 });
}
