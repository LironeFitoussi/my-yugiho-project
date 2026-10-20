import { z } from "zod";

import { currencySchema, moneySchema, parseMoneyInput, type Money } from "@/lib/money";
import { CONDITIONS, type CardCopy, type CardPrinting } from "@/types";

export const conditionSchema = z.enum(CONDITIONS);

export const cardIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim());

/** YYYY-MM-DD that is a real calendar date. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid date");

/** Separator used to encode a printing (set code + rarity) as one select value. */
export const PRINTING_SEPARATOR = "|";
export const printingKey = (p: Pick<CardPrinting, "setCode" | "rarity">) =>
  `${p.setCode}${PRINTING_SEPARATOR}${p.rarity}`;

export type AllowedPrinting = Pick<CardPrinting, "setCode" | "rarity">;

export type CopyInput = {
  printingSetCode: string | null;
  printingRarity: string | null;
  condition: (typeof CONDITIONS)[number];
  purchasePrice: Money | null;
  acquiredAt: string | null;
  notes: string;
};

/**
 * Form fields for adding/editing a copy. `allowedPrintings` are the card's printings; the
 * selected printing must be one of them (or empty). Price is optional — empty means no price.
 */
export function copyFormSchema(allowedPrintings: AllowedPrinting[]) {
  return z
    .object({
      printing: optionalString,
      condition: conditionSchema,
      price: optionalString,
      currency: currencySchema.default("USD"),
      acquiredAt: optionalString.pipe(z.union([z.literal(""), isoDateSchema])),
      notes: optionalString.pipe(z.string().max(1000, "Notes must be 1000 characters or fewer")),
    })
    .transform((data, ctx): CopyInput => {
      let printingSetCode: string | null = null;
      let printingRarity: string | null = null;
      if (data.printing !== "") {
        const match = allowedPrintings.find((p) => printingKey(p) === data.printing);
        if (!match) {
          ctx.addIssue({ code: "custom", path: ["printing"], message: "Choose one of this card's printings" });
          return z.NEVER;
        }
        printingSetCode = match.setCode;
        printingRarity = match.rarity;
      }

      let purchasePrice: Money | null = null;
      if (data.price !== "") {
        purchasePrice = parseMoneyInput(data.price, data.currency);
        if (!purchasePrice) {
          ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a valid amount, e.g. 12.50" });
          return z.NEVER;
        }
      }

      return {
        printingSetCode,
        printingRarity,
        condition: data.condition,
        purchasePrice,
        acquiredAt: data.acquiredAt === "" ? null : data.acquiredAt,
        notes: data.notes,
      };
    });
}

/** Identifies an existing copy (edit/delete). */
export const copyRefSchema = z.object({
  cardId: cardIdSchema,
  copyId: z.uuid(),
});

/** Collection page filters from searchParams. */
export const collectionFiltersSchema = z.object({
  q: z
    .string()
    .max(100)
    .catch("")
    .transform((v) => v.trim()),
  condition: conditionSchema.optional().catch(undefined),
});

/** A CARD_COPY item as stored in DynamoDB → domain CardCopy. */
export const cardCopyItemSchema = z
  .object({
    entityType: z.literal("CARD_COPY"),
    copyId: z.string().min(1),
    cardId: z.number().int().positive(),
    cardName: z.string(),
    printingSetCode: z.string().nullish(),
    printingRarity: z.string().nullish(),
    condition: conditionSchema,
    purchasePriceMinor: moneySchema.shape.amountMinor.nullish(),
    purchasePriceCurrency: currencySchema.nullish(),
    purchaseId: z.string().nullish(),
    acquiredAt: isoDateSchema.nullish(),
    notes: z.string().nullish(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform(
    (item): CardCopy => ({
      copyId: item.copyId,
      cardId: item.cardId,
      cardName: item.cardName,
      printingSetCode: item.printingSetCode ?? null,
      printingRarity: item.printingRarity ?? null,
      condition: item.condition,
      purchasePrice:
        item.purchasePriceMinor != null && item.purchasePriceCurrency != null
          ? { amountMinor: item.purchasePriceMinor, currency: item.purchasePriceCurrency }
          : null,
      purchaseId: item.purchaseId ?? null,
      acquiredAt: item.acquiredAt ?? null,
      notes: item.notes ?? "",
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }),
  );

/** Shape returned by every collection server action to useActionState. */
export type CopyActionState = {
  ok: boolean;
  message: string | null;
  fieldErrors?: Partial<Record<"printing" | "condition" | "price" | "currency" | "acquiredAt" | "notes", string>>;
};

export const initialCopyActionState: CopyActionState = { ok: false, message: null };
