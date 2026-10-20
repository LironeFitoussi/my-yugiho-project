import { z } from "zod";

import { type Currency, currencySchema, type Money, parseMoneyInput } from "@/lib/money";
import { PRODUCT_CATEGORIES } from "@/types";

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");
export const idSchema = z.uuid();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

/** Parses an optional decimal amount field in the given currency; adds an issue on bad input. */
export function parseOptionalAmount(
  value: string,
  currency: Currency,
  path: string,
  ctx: z.RefinementCtx,
): Money | null {
  if (value.trim() === "") return null;
  const money = parseMoneyInput(value, currency);
  if (!money) ctx.addIssue({ code: "custom", path: [path], message: "Enter a valid amount, e.g. 12.50" });
  return money;
}

/** Product create/edit form (PRD §10). Never carries card contents. */
export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    category: z.enum(PRODUCT_CATEGORIES),
    purchaseDate: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(isoDateSchema.nullable()),
    seller: optionalText(200),
    currency: currencySchema,
    price: z.string(),
    shipping: z.string(),
    status: z.enum(["sealed", "opened"]),
    notes: z.string().trim().max(2000),
  })
  .transform(({ price, shipping, ...rest }, ctx) => ({
    ...rest,
    price: parseOptionalAmount(price, rest.currency, "price", ctx),
    shipping: parseOptionalAmount(shipping, rest.currency, "shipping", ctx),
  }));
export type ProductFormInput = z.infer<typeof productFormSchema>;

/** Shape of a PRODUCT item as stored in DynamoDB. */
export const productRecordSchema = z.object({
  productId: z.string(),
  name: z.string(),
  category: z.enum(PRODUCT_CATEGORIES),
  purchaseDate: z.string().nullable().optional(),
  seller: z.string().nullable().optional(),
  priceMinor: z.number().int().nullable().optional(),
  priceCurrency: currencySchema.nullable().optional(),
  shippingMinor: z.number().int().nullable().optional(),
  shippingCurrency: currencySchema.nullable().optional(),
  status: z.enum(["sealed", "opened"]),
  purchaseId: z.string().nullable().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
