import "server-only";

import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { ddb, GSI1, tableName } from "@/lib/aws/client";
import { nowIso, OWNER_PK, productGsi1Sk, productSk, PRODUCTS_GSI1PK } from "@/lib/aws/keys";
import { decodeCursor, encodeCursor, type Page } from "@/lib/aws/pagination";
import type { Product } from "@/types";

import { type ProductFormInput, productRecordSchema } from "./schemas";

/** Thrown for expected, user-facing failures (e.g. deleting a linked product). */
export class ProductError extends Error {
  override name = "ProductError";
}

export function toProduct(item: Record<string, unknown>): Product {
  const r = productRecordSchema.parse(item);
  return {
    productId: r.productId,
    name: r.name,
    category: r.category,
    purchaseDate: r.purchaseDate ?? null,
    seller: r.seller ?? null,
    price: r.priceMinor != null && r.priceCurrency ? { amountMinor: r.priceMinor, currency: r.priceCurrency } : null,
    shipping:
      r.shippingMinor != null && r.shippingCurrency
        ? { amountMinor: r.shippingMinor, currency: r.shippingCurrency }
        : null,
    status: r.status,
    purchaseId: r.purchaseId ?? null,
    notes: r.notes ?? "",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const gsiDate = (purchaseDate: string | null, createdAt: string) => purchaseDate ?? createdAt.slice(0, 10);

function moneyAttrs(input: ProductFormInput) {
  return {
    priceMinor: input.price?.amountMinor ?? null,
    priceCurrency: input.price?.currency ?? null,
    shippingMinor: input.shipping?.amountMinor ?? null,
    shippingCurrency: input.shipping?.currency ?? null,
  };
}

/**
 * Records a product. Writes exactly one PRODUCT item — recording a product never creates
 * card copies (PRD §10). `purchaseId` is only ever set by the purchase-link transaction.
 */
export async function createProduct(input: ProductFormInput): Promise<Product> {
  const productId = crypto.randomUUID();
  const now = nowIso();
  const item = {
    PK: OWNER_PK,
    SK: productSk(productId),
    GSI1PK: PRODUCTS_GSI1PK,
    GSI1SK: productGsi1Sk(gsiDate(input.purchaseDate, now), productId),
    entityType: "PRODUCT",
    productId,
    name: input.name,
    category: input.category,
    purchaseDate: input.purchaseDate,
    seller: input.seller,
    ...moneyAttrs(input),
    status: input.status,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  await ddb().send(
    new PutCommand({ TableName: tableName(), Item: item, ConditionExpression: "attribute_not_exists(PK)" }),
  );
  return toProduct(item);
}

async function getProductRecord(productId: string): Promise<Product | null> {
  const res = await ddb().send(
    new GetCommand({ TableName: tableName(), Key: { PK: OWNER_PK, SK: productSk(productId) } }),
  );
  return res.Item ? toProduct(res.Item) : null;
}

export async function getProduct(productId: string): Promise<Product | null> {
  return getProductRecord(productId);
}

/** Updates editable fields only — never touches purchaseId / purchaseItemSk. */
export async function updateProduct(productId: string, input: ProductFormInput): Promise<Product> {
  const now = nowIso();
  const money = moneyAttrs(input);
  const existing = await getProductRecord(productId);
  if (!existing) throw new ProductError("This product no longer exists.");
  try {
    const res = await ddb().send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: OWNER_PK, SK: productSk(productId) },
        UpdateExpression:
          "SET #name = :name, category = :category, purchaseDate = :purchaseDate, seller = :seller, " +
          "priceMinor = :priceMinor, priceCurrency = :priceCurrency, shippingMinor = :shippingMinor, " +
          "shippingCurrency = :shippingCurrency, #status = :status, notes = :notes, updatedAt = :now, " +
          "GSI1SK = :gsi1sk",
        ConditionExpression: "attribute_exists(PK)",
        ExpressionAttributeNames: { "#name": "name", "#status": "status" },
        ExpressionAttributeValues: {
          ":name": input.name,
          ":category": input.category,
          ":purchaseDate": input.purchaseDate,
          ":seller": input.seller,
          ":priceMinor": money.priceMinor,
          ":priceCurrency": money.priceCurrency,
          ":shippingMinor": money.shippingMinor,
          ":shippingCurrency": money.shippingCurrency,
          ":status": input.status,
          ":notes": input.notes,
          ":now": now,
          ":gsi1sk": productGsi1Sk(gsiDate(input.purchaseDate, existing.createdAt), productId),
        },
        ReturnValues: "ALL_NEW",
      }),
    );
    return toProduct(res.Attributes ?? {});
  } catch (err) {
    if (err instanceof Error && err.name === "ConditionalCheckFailedException") {
      throw new ProductError("This product no longer exists.");
    }
    throw err;
  }
}

/** Deletes a product only when it is not linked to a purchase. */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    await ddb().send(
      new DeleteCommand({
        TableName: tableName(),
        Key: { PK: OWNER_PK, SK: productSk(productId) },
        ConditionExpression: "attribute_exists(PK) AND attribute_not_exists(purchaseId)",
      }),
    );
  } catch (err) {
    if (err instanceof Error && err.name === "ConditionalCheckFailedException") {
      throw new ProductError("This product is part of a purchase. Remove it from the purchase first.");
    }
    throw err;
  }
}

/** Products newest first (GSI1 desc), one page. */
export async function queryProductsPage(cursor?: string | null, limit = 25): Promise<Page<Product>> {
  const res = await ddb().send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: GSI1,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": PRODUCTS_GSI1PK },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: decodeCursor(cursor, { attr: "GSI1PK", value: PRODUCTS_GSI1PK }),
    }),
  );
  return { items: (res.Items ?? []).map(toProduct), cursor: encodeCursor(res.LastEvaluatedKey) };
}

export async function queryAllProducts(): Promise<Product[]> {
  const all: Product[] = [];
  let cursor: string | null = null;
  do {
    const page = await queryProductsPage(cursor, 100);
    all.push(...page.items);
    cursor = page.cursor;
  } while (cursor);
  return all;
}
