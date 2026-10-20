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
  } catch {
    return Response.json({ status: "error", db: false }, { status: 503 });
  }
}
