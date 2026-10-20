import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { Card, CardSet, CardSummary } from "@/types";

import { ygoGet } from "./client";
import { CatalogUnavailableError } from "./client";
import { imageIds, normalizeCard, normalizeSets, toCardSummary } from "./normalize";
import {
  parseEach,
  rawCardInfoEnvelopeSchema,
  rawCardSchema,
  rawSetInfoSchema,
  rawSetListSchema,
  rawSetSchema,
  type RawCard,
} from "./schemas";

// Cached provider reads. Each returns normalized, serializable data (small entries — never the
// whole catalog). Failures throw CatalogUnavailableError so they are never cached; "no match"
// results are cached briefly ("hours") because the provider may add cards later.

export const CATALOG_TAG = "ygoprodeck";

export type CardEntry = { card: Card; imageIds: number[] };

function parseCardInfo(body: unknown, what: string): RawCard[] {
  const envelope = rawCardInfoEnvelopeSchema.safeParse(body);
  if (!envelope.success) throw new CatalogUnavailableError(`YGOPRODeck ${what}: unexpected response shape`);
  return parseEach(envelope.data.data, rawCardSchema);
}

function toEntries(raws: RawCard[]): CardEntry[] {
  return raws.map((raw) => ({ card: normalizeCard(raw), imageIds: imageIds(raw) }));
}

/** cardinfo.php?id=1,2,3 — unknown ids are skipped by the provider. Pass a sorted, small chunk. */
export async function fetchCardsByIdChunk(ids: number[]): Promise<CardEntry[]> {
  "use cache";
  cacheTag(CATALOG_TAG, `${CATALOG_TAG}:cards`);
  const res = await ygoGet("cardinfo.php", { id: ids.join(",") });
  if (res.kind === "no_match") {
    cacheLife("hours");
    return [];
  }
  cacheLife("days");
  return toEntries(parseCardInfo(res.body, "cardinfo by id"));
}

/** cardinfo.php?name=A|B — exact names; returns the provider's canonical record (all artworks). */
export async function fetchCardsByNameChunk(names: string[]): Promise<CardEntry[]> {
  "use cache";
  cacheTag(CATALOG_TAG, `${CATALOG_TAG}:cards`);
  const res = await ygoGet("cardinfo.php", { name: names.join("|") });
  if (res.kind === "no_match") {
    cacheLife("hours");
    return [];
  }
  cacheLife("days");
  return toEntries(parseCardInfo(res.body, "cardinfo by name"));
}

/** cardinfo.php?fname=…&num=…&offset=0 — fuzzy name search, first page only. */
export async function fetchNameSearch(fname: string, num: number): Promise<CardSummary[]> {
  "use cache";
  cacheTag(CATALOG_TAG, `${CATALOG_TAG}:search`);
  cacheLife("hours");
  const res = await ygoGet("cardinfo.php", { fname, num: String(num), offset: "0" });
  if (res.kind === "no_match") return [];
  return parseCardInfo(res.body, "cardinfo by fname").map((raw) => toCardSummary(normalizeCard(raw)));
}

/** cardsets.php — every set (~1k entries, ~175 KB raw). */
export async function fetchSetList(): Promise<CardSet[]> {
  "use cache";
  cacheTag(CATALOG_TAG, `${CATALOG_TAG}:sets`);
  cacheLife("days");
  const res = await ygoGet("cardsets.php");
  if (res.kind === "no_match") return [];
  const list = rawSetListSchema.safeParse(res.body);
  if (!list.success) throw new CatalogUnavailableError("YGOPRODeck cardsets: unexpected response shape");
  return normalizeSets(parseEach(list.data, rawSetSchema));
}

/** cardsetsinfo.php?setcode=LOB-005 → the printing's card id (may be an alternate-artwork id). */
export async function fetchSetInfo(setCode: string): Promise<{ id: number; name: string } | null> {
  "use cache";
  cacheTag(CATALOG_TAG, `${CATALOG_TAG}:cards`);
  const res = await ygoGet("cardsetsinfo.php", { setcode: setCode });
  if (res.kind === "no_match") {
    cacheLife("hours");
    return null;
  }
  const parsed = rawSetInfoSchema.safeParse(res.body);
  if (!parsed.success) throw new CatalogUnavailableError("YGOPRODeck cardsetsinfo: unexpected response shape");
  cacheLife("days");
  return { id: parsed.data.id, name: parsed.data.name };
}

export type SetCardEntry = {
  summary: CardSummary;
  /** Lowest printing code of this card within the set, for ordering ("LOB-001"). */
  orderKey: string;
  /** True when the provider lists alternate artworks — the id in cardset responses may then not be canonical. */
  hasAltArt: boolean;
};

/** cardinfo.php?cardset=<set name> — sets are queried by NAME. */
export async function fetchSetCards(setName: string): Promise<SetCardEntry[]> {
  "use cache";
  cacheTag(CATALOG_TAG, `${CATALOG_TAG}:sets`);
  const res = await ygoGet("cardinfo.php", { cardset: setName });
  if (res.kind === "no_match") {
    cacheLife("hours");
    return [];
  }
  cacheLife("days");
  return parseCardInfo(res.body, "cardinfo by cardset").map((raw) => {
    const codes = (raw.card_sets ?? [])
      .filter((s) => s.set_name.trim() === setName)
      .map((s) => s.set_code)
      .sort();
    return {
      summary: toCardSummary(normalizeCard(raw)),
      orderKey: codes[0] ?? raw.name,
      hasAltArt: imageIds(raw).length > 1,
    };
  });
}
