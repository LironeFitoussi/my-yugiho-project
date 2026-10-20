import { z } from "zod";

import { PRODUCT_CATEGORIES, type WishlistItem } from "@/types";

// Wishlist (PRD §13). Users may wish for extra copies of cards they already own, so
// desiredQuantity is free (≥ 1) and independent of the collection.

export const MAX_DESIRED_QUANTITY = 99;

export const wishCardIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const wishIdSchema = z.uuid();

const notesSchema = z.string().trim().max(2000);
const quantitySchema = z.coerce
  .number({ error: "Enter a quantity" })
  .int("Enter a whole number")
  .min(1, "At least 1")
  .max(MAX_DESIRED_QUANTITY, `At most ${MAX_DESIRED_QUANTITY}`);

export const addCardWishSchema = z.object({
  cardId: wishCardIdSchema,
  desiredQuantity: quantitySchema.default(1),
  notes: notesSchema.default(""),
});
export type AddCardWishInput = z.infer<typeof addCardWishSchema>;

export const updateCardWishSchema = z.object({
  cardId: wishCardIdSchema,
  desiredQuantity: quantitySchema,
  notes: notesSchema,
});
export type UpdateCardWishInput = z.infer<typeof updateCardWishSchema>;

const optionalSetCode = z
  .string()
  .trim()
  .max(20)
  .transform((v) => (v === "" ? null : v.toUpperCase()))
  .pipe(
    z
      .string()
      .regex(/^[A-Z0-9-]+$/, "Letters, digits and dashes only")
      .nullable(),
  );

/**
 * Product wish form. `fulfilledByProductId` links it to a product the user recorded —
 * only ever set explicitly by the user, never auto-matched by name or set code.
 */
export const productWishFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  category: z.enum(PRODUCT_CATEGORIES),
  setCode: optionalSetCode,
  notes: notesSchema,
  fulfilledByProductId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid("Choose a product").nullable()),
});
export type ProductWishInput = z.infer<typeof productWishFormSchema>;

export const wishKeySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("CARD"), id: wishCardIdSchema }),
  z.object({ kind: z.literal("PRODUCT"), id: wishIdSchema }),
]);

// ---------- Stored items ----------

const cardWishRecordSchema = z.object({
  wishKind: z.literal("CARD"),
  cardId: z.number().int().positive(),
  cardName: z.string(),
  desiredQuantity: z.number().int().min(1),
  notes: z.string().optional(),
  createdAt: z.string(),
});

const productWishRecordSchema = z.object({
  wishKind: z.literal("PRODUCT"),
  wishId: z.string(),
  name: z.string(),
  category: z.enum(PRODUCT_CATEGORIES),
  setCode: z.string().nullable().optional(),
  fulfilledByProductId: z.string().nullable().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const wishlistRecordSchema = z
  .discriminatedUnion("wishKind", [cardWishRecordSchema, productWishRecordSchema])
  .transform((r): WishlistItem => {
    if (r.wishKind === "CARD") {
      return {
        kind: "CARD",
        cardId: r.cardId,
        cardName: r.cardName,
        desiredQuantity: r.desiredQuantity,
        notes: r.notes ?? "",
        createdAt: r.createdAt,
      };
    }
    return {
      kind: "PRODUCT",
      wishId: r.wishId,
      name: r.name,
      category: r.category,
      setCode: r.setCode ?? null,
      fulfilledByProductId: r.fulfilledByProductId ?? null,
      notes: r.notes ?? "",
      createdAt: r.createdAt,
    };
  });

// ---------- List filters (searchParams) ----------

export const wishlistFiltersSchema = z.object({
  kind: z.enum(["all", "card", "product"]).catch("all"),
  status: z.enum(["all", "wanted", "owned"]).catch("all"),
  q: z.string().trim().max(100).catch(""),
});
export type WishlistFilters = z.infer<typeof wishlistFiltersSchema>;

export type WishlistActionState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string[] | undefined> };
export const initialWishlistActionState: WishlistActionState = {};
