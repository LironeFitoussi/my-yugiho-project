import { z } from "zod";

import { idSchema, isoDateSchema, parseOptionalAmount } from "@/features/products/schemas";
import { currencySchema, parseMoneyInput } from "@/lib/money";

export { idSchema, isoDateSchema };

/** Purchase header create/edit form (PRD §11). Shipping is separate from the subtotal. */
export const purchaseFormSchema = z
  .object({
    date: isoDateSchema,
    seller: z.string().trim().min(1, "Seller is required").max(200),
    currency: currencySchema,
    shipping: z.string(),
    notes: z.string().trim().max(2000),
  })
  .transform(({ shipping, ...rest }, ctx) => ({
    ...rest,
    shippingMinor: parseOptionalAmount(shipping, rest.currency, "shipping", ctx)?.amountMinor ?? 0,
  }));
export type PurchaseFormInput = z.infer<typeof purchaseFormSchema>;

const amountField = z.string();

/** Adding one line to a purchase. The amount is always in the purchase's currency. */
export const addItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("COPY"),
    // "<cardId>:<copyId>" from the copy picker
    ref: z
      .string()
      .regex(/^[1-9]\d{0,15}:[A-Za-z0-9_-]{1,64}$/, "Pick a copy")
      .transform((v) => {
        const [cardId, copyId] = v.split(":");
        return { cardId: Number(cardId), copyId };
      }),
    amount: amountField,
  }),
  z.object({ kind: z.literal("PRODUCT"), productId: idSchema, amount: amountField }),
  z.object({
    kind: z.literal("MISC"),
    description: z.string().trim().min(1, "Describe the line, e.g. “Lot of commons”").max(200),
    amount: amountField,
  }),
]);
export type AddItemInput = z.infer<typeof addItemSchema>;

export type NewPurchaseItem =
  | { kind: "COPY"; cardId: number; copyId: string; amountMinor: number }
  | { kind: "PRODUCT"; productId: string; amountMinor: number }
  | { kind: "MISC"; itemId: string; description: string; amountMinor: number };

/** Parses an amount in the purchase currency into integer minor units (zero allowed). */
export function parseItemAmount(amount: string, currency: z.infer<typeof currencySchema>): number | null {
  return parseMoneyInput(amount, currency)?.amountMinor ?? null;
}

export const purchaseRecordSchema = z.object({
  purchaseId: z.string(),
  date: z.string(),
  seller: z.string(),
  currency: currencySchema,
  subtotalMinor: z.number().int(),
  shippingMinor: z.number().int(),
  itemCount: z.number().int(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const purchaseItemRecordSchema = z.object({
  purchaseId: z.string(),
  kind: z.enum(["COPY", "PRODUCT", "MISC"]),
  refId: z.string(),
  cardId: z.number().int().nullable().optional(),
  description: z.string(),
  amountMinor: z.number().int(),
  createdAt: z.string(),
});
