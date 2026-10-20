import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { connection } from "next/server";

import { ddb, tableName } from "@/lib/aws/client";

// Public health check for Render. Reports only up/down — no table details or errors.
export async function GET() {
  await connection();
  try {
    const result = await ddb().send(new DescribeTableCommand({ TableName: tableName() }));
    const ok = result.Table?.TableStatus === "ACTIVE";
    return Response.json({ status: ok ? "ok" : "degraded", db: ok }, { status: ok ? 200 : 503 });
  } catch (error) {
    // Log only the error class server-side (e.g. ResourceNotFoundException, CredentialsProviderError).
    console.error("[health] DynamoDB check failed:", error instanceof Error ? error.name : "unknown");
    return Response.json({ status: "error", db: false }, { status: 503 });
  }
}
