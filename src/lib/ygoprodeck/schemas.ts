// Zod schemas for raw YGOPRODeck API v7 responses (verified against live responses, 2026-10).
// Unknown keys are stripped. Fixtures: tests/fixtures/ygoprodeck/.
import { z } from "zod";

const optionalString = z.string().nullish();

export const rawCardImageSchema = z.object({
  id: z.number().int(),
  image_url: optionalString,
  image_url_small: optionalString,
});

export const rawCardSetEntrySchema = z.object({
  set_name: z.string(),
  set_code: z.string(),
  set_rarity: z.string().nullish(),
  set_rarity_code: optionalString,
  /** Decimal string in USD (TCGplayer), e.g. "6.97", "2.1", "0.00". */
  set_price: optionalString,
});

/** Decimal strings in their source currency. cardmarket is EUR; the rest are USD. */
export const rawCardPricesSchema = z.object({
  cardmarket_price: optionalString,
  tcgplayer_price: optionalString,
  ebay_price: optionalString,
  amazon_price: optionalString,
  coolstuffinc_price: optionalString,
});

export const rawCardSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  type: z.string(),
  frameType: optionalString,
  desc: z.string().nullish(),
  race: optionalString,
  attribute: optionalString,
  archetype: optionalString,
  atk: z.number().int().nullish(),
  def: z.number().int().nullish(),
  level: z.number().int().nullish(),
  card_images: z.array(rawCardImageSchema).nullish(),
  card_prices: z.array(rawCardPricesSchema).nullish(),
  card_sets: z.array(rawCardSetEntrySchema).nullish(),
});
export type RawCard = z.infer<typeof rawCardSchema>;

/** cardinfo.php envelope. Cards are validated one by one so a single odd record can't sink a page. */
export const rawCardInfoEnvelopeSchema = z.object({
  data: z.array(z.unknown()),
  meta: z
    .object({
      total_rows: z.number().int().nullish(),
      rows_remaining: z.number().int().nullish(),
      next_page_offset: z.number().int().nullish(),
    })
    .nullish(),
});

/** cardsets.php: one entry per set. `set_code` is NOT unique (e.g. "IOC" + "IOC Special Edition"). */
export const rawSetSchema = z.object({
  set_name: z.string().min(1),
  set_code: z.string().min(1),
  num_of_cards: z.number().int().nullish(),
  tcg_date: optionalString,
  set_image: optionalString,
});
export type RawSet = z.infer<typeof rawSetSchema>;
export const rawSetListSchema = z.array(z.unknown());

/** cardsetsinfo.php?setcode=LOB-005 — note `id` may be an alternate-artwork id, not the canonical card id. */
export const rawSetInfoSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  set_name: z.string(),
  set_code: z.string(),
  set_rarity: z.string().nullish(),
  set_price: optionalString,
});
export type RawSetInfo = z.infer<typeof rawSetInfoSchema>;

/** Provider error body: HTTP 400 on cardinfo.php, HTTP 200 on cardsetsinfo.php. */
export const rawErrorSchema = z.object({ error: z.string() });

/** Validates each element, silently dropping malformed ones. */
export function parseEach<T>(items: unknown[], schema: z.ZodType<T>): T[] {
  const out: T[] = [];
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}
