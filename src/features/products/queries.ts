import "server-only";

import { cache } from "react";

import type { Page } from "@/lib/aws/pagination";
import { requireOwner } from "@/lib/auth";
import type { Product } from "@/types";

import { getProduct as getProductRecord, queryAllProducts, queryProductsPage } from "./repository";
import { idSchema } from "./schemas";

/** One page of products, newest purchase date first. */
export async function listProducts(cursor?: string | null): Promise<Page<Product>> {
  await requireOwner();
  return queryProductsPage(cursor);
}

/** Every product (all pages). Cached per request. */
export const listAllProducts = cache(async (): Promise<Product[]> => {
  await requireOwner();
  return queryAllProducts();
});

export async function getProduct(productId: string): Promise<Product | null> {
  await requireOwner();
  const parsed = idSchema.safeParse(productId);
  if (!parsed.success) return null;
  return getProductRecord(parsed.data);
}
