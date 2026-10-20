import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { serverEnv } from "@/lib/env";

let docClient: DynamoDBDocumentClient | undefined;

/** Shared DynamoDB document client. Honours DYNAMODB_ENDPOINT for DynamoDB Local. */
export function ddb(): DynamoDBDocumentClient {
  if (!docClient) {
    const env = serverEnv();
    const client = new DynamoDBClient({
      region: env.AWS_REGION,
      ...(env.DYNAMODB_ENDPOINT ? { endpoint: env.DYNAMODB_ENDPOINT } : {}),
    });
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
}

export function tableName(): string {
  return serverEnv().DYNAMODB_TABLE;
}

export const GSI1 = "GSI1";
