// Creates the yugioh-collection table in DynamoDB Local. Run: npm run db:create-local
import { CreateTableCommand, DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";

import { tableDefinition } from "../src/lib/aws/table-definition.ts";

const endpoint = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
const table = process.env.DYNAMODB_TABLE ?? "yugioh-collection";

if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(endpoint)) {
  console.error(`Refusing to create a table on non-local endpoint: ${endpoint}`);
  process.exit(1);
}

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "eu-central-1",
  endpoint,
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

try {
  await client.send(new DescribeTableCommand({ TableName: table }));
  console.log(`Table ${table} already exists at ${endpoint}`);
} catch {
  await client.send(new CreateTableCommand(tableDefinition(table)));
  console.log(`Created ${table} at ${endpoint}`);
}
