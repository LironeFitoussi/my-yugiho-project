import "server-only";

import { rawErrorSchema } from "./schemas";

// Low-level YGOPRODeck API v7 transport: timeout, shared rate limiter, retry with backoff.
// The provider blocks clients for 1 hour above 20 req/s, so we stay at ≤ 15 req/s per process.

export const YGOPRODECK_BASE_URL = "https://db.ygoprodeck.com/api/v7";

export type Endpoint = "cardinfo.php" | "cardsets.php" | "cardsetsinfo.php";

/** "ok" carries the parsed JSON body; "no_match" is the provider's "No card matching your query" error. */
export type FetchResult = { kind: "ok"; body: unknown } | { kind: "no_match" };

/** Thrown for timeouts, network errors, 429/5xx after retries, and malformed responses. Never cached. */
export class CatalogUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CatalogUnavailableError";
  }
}

const MAX_REQUESTS_PER_SECOND = 15;
const MIN_INTERVAL_MS = Math.ceil(1000 / MAX_REQUESTS_PER_SECOND);
const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Shared limiter: each request reserves the next start slot ≥ MIN_INTERVAL_MS after the previous one.
let nextSlot = 0;
async function acquireSlot(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + MIN_INTERVAL_MS;
  if (slot > now) await sleep(slot - now);
}

/** Test hook: resets the limiter between tests. */
export function resetRateLimiterForTests() {
  nextSlot = 0;
}

function isNoMatch(body: unknown): boolean {
  const parsed = rawErrorSchema.safeParse(body);
  return parsed.success && /no card matching/i.test(parsed.data.error);
}

function retryDelay(attempt: number, retryAfter: string | null): number {
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 10_000);
  return BASE_BACKOFF_MS * 2 ** attempt + Math.floor(Math.random() * 100);
}

export async function ygoGet(endpoint: Endpoint, params: Record<string, string> = {}): Promise<FetchResult> {
  const url = new URL(`${YGOPRODECK_BASE_URL}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await acquireSlot();
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS - 1) await sleep(retryDelay(attempt, null));
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`HTTP ${res.status}`);
      if (attempt < MAX_ATTEMPTS - 1) await sleep(retryDelay(attempt, res.headers.get("retry-after")));
      continue;
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch (error) {
      throw new CatalogUnavailableError(`YGOPRODeck ${endpoint}: invalid JSON (HTTP ${res.status})`, { cause: error });
    }

    // cardinfo.php answers 400 + {error}; cardsetsinfo.php answers 200 + {error}.
    if (isNoMatch(body)) return { kind: "no_match" };
    if (!res.ok) throw new CatalogUnavailableError(`YGOPRODeck ${endpoint}: HTTP ${res.status}`);
    return { kind: "ok", body };
  }
  throw new CatalogUnavailableError(`YGOPRODeck ${endpoint}: unavailable after ${MAX_ATTEMPTS} attempts`, {
    cause: lastError,
  });
}
