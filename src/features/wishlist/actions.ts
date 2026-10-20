"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProduct } from "@/features/products/queries";
import { wishlistCardSk, wishlistProductSk } from "@/lib/aws/keys";
import { requireOwner } from "@/lib/auth";
import { getCard } from "@/lib/ygoprodeck";

import { createProductWish, deleteWish, putCardWish, updateCardWish, updateProductWish } from "./repository";
import {
  addCardWishSchema,
  productWishFormSchema,
  updateCardWishSchema,
  wishIdSchema,
  wishKeySchema,
  type WishlistActionState,
} from "./schemas";

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : undefined;
};

function revalidateWishlist(cardId?: number) {
  revalidatePath("/wishlist");
  revalidatePath("/");
  if (cardId) revalidatePath(`/cards/${cardId}`);
}

function failure(error: unknown): WishlistActionState {
  console.error("[wishlist] action failed", error);
  return { ok: false, message: "Something went wrong. Please try again." };
}

/** Adds a card to the wishlist (one entry per card). The card name comes from the catalog, not the client. */
export async function addCardWishAction(_prev: WishlistActionState, formData: FormData): Promise<WishlistActionState> {
  await requireOwner();
  const parsed = addCardWishSchema.safeParse({
    cardId: str(formData, "cardId"),
    desiredQuantity: str(formData, "desiredQuantity") || undefined,
    notes: str(formData, "notes"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const card = await getCard(parsed.data.cardId);
  if (!card.ok) {
    return {
      ok: false,
      message: card.error === "not_found" ? "Card not found." : "The card catalog is unavailable. Try again later.",
    };
  }
  try {
    const result = await putCardWish(card.data, parsed.data);
    if (!result.ok) return { ok: false, message: "This card is already on your wishlist." };
  } catch (error) {
    return failure(error);
  }
  revalidateWishlist(card.data.id);
  return { ok: true, message: "Added to wishlist." };
}

export async function updateCardWishAction(_prev: WishlistActionState, formData: FormData): Promise<WishlistActionState> {
  await requireOwner();
  const parsed = updateCardWishSchema.safeParse({
    cardId: str(formData, "cardId"),
    desiredQuantity: str(formData, "desiredQuantity"),
    notes: str(formData, "notes") ?? "",
  });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    const result = await updateCardWish(parsed.data.cardId, parsed.data);
    if (!result.ok) return { ok: false, message: "This wishlist entry no longer exists." };
  } catch (error) {
    return failure(error);
  }
  revalidateWishlist(parsed.data.cardId);
  return { ok: true, message: "Saved." };
}

/** Validates an explicit product link: it must reference a product the user recorded. */
async function checkFulfilledBy(productId: string | null): Promise<WishlistActionState | null> {
  if (!productId) return null;
  return (await getProduct(productId))
    ? null
    : { ok: false, fieldErrors: { fulfilledByProductId: ["That product no longer exists."] } };
}

function readProductWish(formData: FormData) {
  return productWishFormSchema.safeParse({
    name: str(formData, "name") ?? "",
    category: str(formData, "category"),
    setCode: str(formData, "setCode") ?? "",
    notes: str(formData, "notes") ?? "",
    fulfilledByProductId: str(formData, "fulfilledByProductId") ?? "",
  });
}

export async function createProductWishAction(
  _prev: WishlistActionState,
  formData: FormData,
): Promise<WishlistActionState> {
  await requireOwner();
  const parsed = readProductWish(formData);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const invalidLink = await checkFulfilledBy(parsed.data.fulfilledByProductId);
  if (invalidLink) return invalidLink;
  try {
    await createProductWish(parsed.data);
  } catch (error) {
    return failure(error);
  }
  revalidateWishlist();
  return { ok: true, message: "Product added to wishlist." };
}

export async function updateProductWishAction(
  _prev: WishlistActionState,
  formData: FormData,
): Promise<WishlistActionState> {
  await requireOwner();
  const id = wishIdSchema.safeParse(str(formData, "wishId"));
  if (!id.success) return { ok: false, message: "Invalid wishlist entry." };
  const parsed = readProductWish(formData);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const invalidLink = await checkFulfilledBy(parsed.data.fulfilledByProductId);
  if (invalidLink) return invalidLink;
  try {
    const result = await updateProductWish(id.data, parsed.data);
    if (!result.ok) return { ok: false, message: "This wishlist entry no longer exists." };
  } catch (error) {
    return failure(error);
  }
  revalidateWishlist();
  return { ok: true, message: "Saved." };
}

export async function removeWishAction(_prev: WishlistActionState, formData: FormData): Promise<WishlistActionState> {
  await requireOwner();
  const key = wishKeySchema.safeParse({ kind: str(formData, "kind"), id: str(formData, "id") });
  if (!key.success) return { ok: false, message: "Invalid wishlist entry." };
  const sk = key.data.kind === "CARD" ? wishlistCardSk(key.data.id) : wishlistProductSk(key.data.id);
  try {
    await deleteWish(sk);
  } catch (error) {
    return failure(error);
  }
  revalidateWishlist(key.data.kind === "CARD" ? key.data.id : undefined);
  return { ok: true, message: "Removed from wishlist." };
}
