// Raw YGOPRODeck shapes → internal domain types (src/types). Pure; unit-tested against fixtures.
import { isClassicCard, isClassicSet } from "@/features/catalog/classic";
import { parseMoneyInput } from "@/lib/money";
import type { Card, CardPrinting, CardSet, CardSummary, CatalogPrice } from "@/types";

import type { RawCard, RawSet } from "./schemas";

/**
 * Parses a provider USD decimal string into minor units with string math.
 * Missing, malformed, or zero ("0", "0.00") prices are unavailable → null. Never invented.
 */
export function parseUsdPrice(value: string | null | undefined, source: string): CatalogPrice | null {
  if (value == null) return null;
  const money = parseMoneyInput(value, "USD");
  if (!money || money.amountMinor <= 0) return null;
  return { amountMinor: money.amountMinor, currency: "USD", source };
}

/**
 * USD-only general market sources, in priority order. cardmarket_price is EUR and is never used.
 * The first source with a usable (non-zero) price wins; its name is recorded as `source`.
 */
export const MARKET_PRICE_SOURCES = [
  ["tcgplayer_price", "tcgplayer"],
  ["ebay_price", "ebay"],
  ["amazon_price", "amazon"],
  ["coolstuffinc_price", "coolstuffinc"],
] as const;

export function pickMarketPrice(prices: RawCard["card_prices"]): CatalogPrice | null {
  const entry = prices?.[0];
  if (!entry) return null;
  for (const [field, source] of MARKET_PRICE_SOURCES) {
    const price = parseUsdPrice(entry[field], source);
    if (price) return price;
  }
  return null;
}

export const PRINTING_PRICE_SOURCE = "tcgplayer-set-price";

export function normalizePrintings(sets: RawCard["card_sets"]): CardPrinting[] {
  const seen = new Set<string>();
  const out: CardPrinting[] = [];
  for (const s of sets ?? []) {
    const setCode = s.set_code.trim();
    const rarity = (s.set_rarity ?? "").trim();
    const key = `${setCode}|${rarity}|${s.set_name}`;
    if (!setCode || seen.has(key)) continue;
    seen.add(key);
    out.push({
      setName: s.set_name.trim(),
      setCode,
      rarity,
      rarityCode: s.set_rarity_code?.trim() || null,
      price: parseUsdPrice(s.set_price, PRINTING_PRICE_SOURCE),
    });
  }
  return out;
}

function pickImage(raw: RawCard) {
  const images = raw.card_images ?? [];
  return images.find((img) => img.id === raw.id) ?? images[0] ?? null;
}

function nonEmpty(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export function normalizeCard(raw: RawCard): Card {
  const image = pickImage(raw);
  const isLink = (raw.frameType ?? "").toLowerCase().includes("link") || /\blink\b/i.test(raw.type);
  return {
    id: raw.id,
    name: raw.name.trim(),
    type: raw.type,
    frameType: nonEmpty(raw.frameType),
    description: raw.desc ?? "",
    race: nonEmpty(raw.race),
    attribute: nonEmpty(raw.attribute),
    archetype: nonEmpty(raw.archetype),
    atk: raw.atk ?? null,
    def: isLink ? null : (raw.def ?? null),
    // Link monsters report level 0, which is not a real level.
    level: isLink || raw.level == null ? null : raw.level,
    imageUrl: nonEmpty(image?.image_url),
    imageUrlSmall: nonEmpty(image?.image_url_small),
    printings: normalizePrintings(raw.card_sets),
    marketPrice: pickMarketPrice(raw.card_prices),
  };
}

export function toCardSummary(card: Card): CardSummary {
  return {
    id: card.id,
    name: card.name,
    type: card.type,
    imageUrlSmall: card.imageUrlSmall,
    attribute: card.attribute,
    race: card.race,
    isClassic: isClassicCard(card),
  };
}

/** All artwork ids the provider lists for this card (canonical id + alternate arts). */
export function imageIds(raw: RawCard): number[] {
  return [...new Set((raw.card_images ?? []).map((img) => img.id))];
}

/**
 * cardsets.php → CardSet[] with a unique, URL-safe `code`.
 * The provider reuses set codes (e.g. "IOC" for "Invasion of Chaos" and its 4-card Special Edition).
 * The largest set (ties: earliest, then name) keeps the bare prefix; the others get "<CODE>_2", "<CODE>_3", …
 * ordered by release date then name, so ids are stable while the provider's list is stable.
 */
export function normalizeSets(rawSets: RawSet[]): CardSet[] {
  const groups = new Map<string, RawSet[]>();
  for (const s of rawSets) {
    const code = s.set_code.trim().toUpperCase();
    if (!/^[A-Z0-9]+$/.test(code)) continue;
    const group = groups.get(code) ?? [];
    group.push(s);
    groups.set(code, group);
  }
  const byDateThenName = (a: RawSet, b: RawSet) =>
    (a.tcg_date ?? "9999").localeCompare(b.tcg_date ?? "9999") || a.set_name.localeCompare(b.set_name);

  const out: CardSet[] = [];
  for (const [code, group] of groups) {
    const primary = [...group].sort(
      (a, b) => (b.num_of_cards ?? 0) - (a.num_of_cards ?? 0) || byDateThenName(a, b),
    )[0]!;
    const rest = group.filter((s) => s !== primary).sort(byDateThenName);
    out.push(toCardSet(code, primary));
    rest.forEach((s, i) => out.push(toCardSet(`${code}_${i + 2}`, s)));
  }
  return out.sort((a, b) => (a.releaseDate ?? "9999").localeCompare(b.releaseDate ?? "9999") || a.name.localeCompare(b.name));
}

function toCardSet(code: string, s: RawSet): CardSet {
  const date = s.tcg_date && /^\d{4}-\d{2}-\d{2}$/.test(s.tcg_date) ? s.tcg_date : null;
  return {
    code,
    name: s.set_name.trim(),
    cardCount: s.num_of_cards ?? 0,
    releaseDate: date,
    imageUrl: nonEmpty(s.set_image),
    isClassic: isClassicSet(code),
  };
}
