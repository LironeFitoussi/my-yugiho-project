"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/auth";

import { createProduct, deleteProduct, ProductError, updateProduct } from "./repository";
import { idSchema, productFormSchema } from "./schemas";

export type ProductActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted values, echoed back on failure so React's post-action form reset keeps them. */
  values?: Record<string, string>;
};

function readForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    name: get("name"),
    category: get("category"),
    purchaseDate: get("purchaseDate"),
    seller: get("seller"),
    currency: get("currency"),
    price: get("price"),
    shipping: get("shipping"),
    status: get("status"),
    notes: get("notes"),
  };
}

function failure(err: unknown): ProductActionState {
  if (err instanceof ProductError) return { error: err.message };
  console.error("product action failed", err);
  return { error: "Something went wrong. Please try again." };
}

function revalidateProducts() {
  revalidatePath("/products");
  revalidatePath("/purchases", "layout");
  revalidatePath("/");
}

export async function createProductAction(_prev: ProductActionState, formData: FormData): Promise<ProductActionState> {
  await requireOwner();
  const values = readForm(formData);
  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  try {
    await createProduct(parsed.data);
  } catch (err) {
    return { ...failure(err), values };
  }
  revalidateProducts();
  return { ok: true };
}

export async function updateProductAction(_prev: ProductActionState, formData: FormData): Promise<ProductActionState> {
  await requireOwner();
  const id = idSchema.safeParse(formData.get("productId"));
  if (!id.success) return { error: "Invalid product." };
  const values = readForm(formData);
  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  try {
    await updateProduct(id.data, parsed.data);
  } catch (err) {
    return { ...failure(err), values };
  }
  revalidateProducts();
  return { ok: true };
}

export async function deleteProductAction(_prev: ProductActionState, formData: FormData): Promise<ProductActionState> {
  await requireOwner();
  const id = idSchema.safeParse(formData.get("productId"));
  if (!id.success) return { error: "Invalid product." };
  try {
    await deleteProduct(id.data);
  } catch (err) {
    return failure(err);
  }
  revalidateProducts();
  return { ok: true };
}
