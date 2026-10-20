---
name: ygoprodeck-client
description: Work on the YGOPRODeck API v7 integration in src/lib/ygoprodeck (PRD §7, §17) — card search by name/ID/passcode/set code, sets, images, market prices, classic Duel Monsters filter. Use whenever external catalog data is fetched, normalized, or cached.
---

# YGOPRODeck catalog client

All provider calls go through `src/lib/ygoprodeck`. Nothing else imports provider URLs or response shapes.

## Before coding
Check the live docs: `WebFetch https://ygoprodeck.com/api-guide/`. Endpoints used (§17):
- `GET /api/v7/cardinfo.php`: search by `fname`/`name`, `id` (passcode/card ID); the response includes `card_sets` (set code, rarity, price) and `card_prices`.
- `GET /api/v7/cardsets.php`: all sets.
- `GET /api/v7/cardsetsinfo.php?setcode=…`: resolve a set code to its card.
Don't guess field names. Follow the provider's image usage rules (they ask you not to hotlink at volume).

## Structure
```
src/lib/ygoprodeck/
  client.ts     # "server-only"; fetch wrapper, rate limit, retries, caching
  schemas.ts    # Zod for raw responses
  normalize.ts  # raw → internal types in src/types (Card, CardPrinting, CardSet)
  index.ts      # searchCards, getCard, lookupBySetCode, listSets, getSetCards
```

## Rules
- **Identity**: the provider's canonical card ID is the key. Never key on the name. One card has many printings across many sets.
- **Validate** every response with Zod. "No card found" responses become a typed not-found result, not an exception the UI has to parse.
- **Errors**: handle timeouts, 4xx/5xx, and 429 with backoff. The personal inventory must still render when the provider is down (§17).
- **Rate limit**: stay under about 20 req/s with a shared limiter, and never run an unbounded `Promise.all`.
- **Cache**: use Next 16 `"use cache"` + `cacheLife`/`cacheTag` (read `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`). Optionally persist cards the user references as `CARD_CACHE` items. **Don't download the whole catalog.**
- **Prices** (§12 priority): printing-specific price first, then the general card price, labelled **Estimated**, then `null` → **Price Unavailable**. Never `0`, never invented, no condition multipliers.
- **Classic Duel Monsters filter** (§7): the API has no such classification. Use a curated, versioned dataset in the repo (e.g. `src/features/catalog/data/classic-*.json`) with a documented inclusion rule. Don't infer it heuristically from API fields.

## Tests
Unit-test `normalize.ts` and price fallback against recorded fixtures in `tests/fixtures/ygoprodeck/`, including error and empty responses. Tests never hit the live API.
