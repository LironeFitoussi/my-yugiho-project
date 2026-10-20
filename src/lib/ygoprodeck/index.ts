import "server-only";

import { unstable_rethrow } from "next/navigation";

import type { Card, CardSet, CardSummary } from "@/types";

import {
  fetchCardsByIdChunk,
  fetchCardsByNameChunk,
  fetchNameSearch,
  fetchSetCards,
  fetchSetInfo,
  fetchSetList,
  type CardEntry,
} from "./cached";
import { toCardSummary } from "./normalize";
import { classifyQuery } from "./query";

export { classifyQuery } from "./query";

export type CatalogError = "not_found" | "unavailable";
export type CatalogResult<T> = { ok: true; data: T } | { ok: false; error: CatalogError };

export type CardSearchQuery = {
  /** Free text: card name, numeric card ID / passcode, or a set code like "LOB-005". */
  q: string;
  classicOnly?: boolean;
  limit?: number;
};

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const ID_CHUNK = 50;
const NAME_CHUNK = 20;

const unavailable = { ok: false, error: "unavailable" } as const;
const notFound = { ok: false, error: "not_found" } as const;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Runs a provider read, mapping any failure (timeouts, 5xx, bad shapes) to "unavailable". */
async function guard<T>(fn: () => Promise<CatalogResult<T>>): Promise<CatalogResult<T>> {
  try {
    return await fn();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[ygoprodeck]", error instanceof Error ? error.message : error);
    return unavailable;
  }
}

/**
 * The provider's id lookups echo alternate-artwork ids (e.g. 46986421 for Dark Magician), and
 * cardset responses can report one too. The canonical record — the one an exact-name lookup
 * returns, whose artworks include the alt id — is the card's identity. Sequential, chunked.
 */
async function canonicalize(entries: CardEntry[]): Promise<Map<number, Card>> {
  const names = [...new Set(entries.map((e) => e.card.name))];
  const byName = new Map<string, CardEntry>();
  for (const part of chunk(names, NAME_CHUNK)) {
    for (const entry of await fetchCardsByNameChunk(part)) byName.set(entry.card.name.toLowerCase(), entry);
  }
  const out = new Map<number, Card>();
  for (const entry of entries) {
    const canonical = byName.get(entry.card.name.toLowerCase());
    const sameCard = canonical && (canonical.card.id === entry.card.id || canonical.imageIds.includes(entry.card.id));
    out.set(entry.card.id, sameCard ? canonical.card : entry.card);
  }
  return out;
}

export async function getCard(id: number): Promise<CatalogResult<Card>> {
  if (!Number.isSafeInteger(id) || id <= 0) return notFound;
  return guard(async () => {
    const [entry] = await fetchCardsByIdChunk([id]);
    if (!entry) return notFound;
    const card = (await canonicalize([entry])).get(entry.card.id) ?? entry.card;
    return { ok: true, data: card };
  });
}

/**
 * Batched, cached, rate-limited. Cards the provider can't return are simply absent.
 * Keys are the requested ids; values carry the canonical card (whose id may differ for alt-art ids).
 * Provider failures also yield absent entries — callers must tolerate a partial map.
 */
export async function getCardsByIds(ids: number[]): Promise<Map<number, Card>> {
  const unique = [...new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0))].sort((a, b) => a - b);
  const result = new Map<number, Card>();
  for (const part of chunk(unique, ID_CHUNK)) {
    try {
      const entries = await fetchCardsByIdChunk(part);
      // Id lookups always return a single artwork, so alt-art echoes can't be spotted locally:
      // canonicalize every card through the (cached) exact-name lookup.
      const canonical = await canonicalize(entries);
      for (const [requestedId, card] of canonical) result.set(requestedId, card);
    } catch (error) {
      unstable_rethrow(error);
      console.error("[ygoprodeck] getCardsByIds chunk failed", error instanceof Error ? error.message : error);
    }
  }
  return result;
}

/** Resolves a printing code ("LOB-005") to its card. */
export async function lookupBySetCode(setCode: string): Promise<CatalogResult<Card>> {
  const code = setCode.trim().toUpperCase();
  if (!code) return notFound;
  return guard(async () => {
    const info = await fetchSetInfo(code);
    if (!info) return notFound;
    return getCard(info.id);
  });
}

export async function searchCards(query: CardSearchQuery): Promise<CatalogResult<CardSummary[]>> {
  const limit = Math.min(Math.max(1, Math.floor(query.limit ?? DEFAULT_LIMIT)), MAX_LIMIT);
  const classify = classifyQuery(query.q);
  const keep = (cards: CardSummary[]) =>
    (query.classicOnly ? cards.filter((c) => c.isClassic) : cards).slice(0, limit);

  const single = (res: CatalogResult<Card>): CatalogResult<CardSummary[]> => {
    if (res.ok) return { ok: true, data: keep([toCardSummary(res.data)]) };
    return res.error === "not_found" ? { ok: true, data: [] } : unavailable;
  };

  switch (classify.kind) {
    case "empty":
      return { ok: true, data: [] };
    case "id":
      return single(await getCard(classify.id));
    case "setCode":
      return single(await lookupBySetCode(classify.setCode));
    case "name":
      return guard(async () => {
        // Classic filtering happens after the fetch, so pull a full page to leave enough matches.
        const num = query.classicOnly ? MAX_LIMIT : limit;
        return { ok: true, data: keep(await fetchNameSearch(classify.name, num)) };
      });
  }
}

export async function listSets(): Promise<CatalogResult<CardSet[]>> {
  return guard(async () => ({ ok: true, data: await fetchSetList() }));
}

/** Set contents as unique cards. `setCode` is the CardSet.code prefix (e.g. "LOB"). */
export async function getSetCards(
  setCode: string,
): Promise<CatalogResult<{ set: CardSet; cards: CardSummary[] }>> {
  const code = setCode.trim().toUpperCase();
  return guard(async () => {
    const set = (await fetchSetList()).find((s) => s.code === code);
    if (!set) return notFound;
    const entries = await fetchSetCards(set.name);

    const altArt = entries.filter((e) => e.hasAltArt);
    const names = [...new Set(altArt.map((e) => e.summary.name))];
    const canonicalByName = new Map<string, CardEntry>();
    for (const part of chunk(names, NAME_CHUNK)) {
      for (const entry of await fetchCardsByNameChunk(part)) canonicalByName.set(entry.card.name.toLowerCase(), entry);
    }

    const seen = new Set<number>();
    const cards: { summary: CardSummary; orderKey: string }[] = [];
    for (const entry of entries) {
      let summary = entry.summary;
      if (entry.hasAltArt) {
        const canonical = canonicalByName.get(summary.name.toLowerCase());
        if (canonical && (canonical.card.id === summary.id || canonical.imageIds.includes(summary.id))) {
          summary = toCardSummary(canonical.card);
        }
      }
      if (seen.has(summary.id)) continue; // unique card identities only
      seen.add(summary.id);
      cards.push({ summary, orderKey: entry.orderKey });
    }
    cards.sort((a, b) => a.orderKey.localeCompare(b.orderKey) || a.summary.name.localeCompare(b.summary.name));
    return { ok: true, data: { set, cards: cards.map((c) => c.summary) } };
  });
}
