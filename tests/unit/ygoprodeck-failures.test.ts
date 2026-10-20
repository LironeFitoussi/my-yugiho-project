import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));

const { ygoGet, CatalogUnavailableError, resetRateLimiterForTests } = await import("@/lib/ygoprodeck/client");
const catalog = await import("@/lib/ygoprodeck");

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(__dirname, "../fixtures/ygoprodeck", name), "utf8"));
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const timeoutError = () => new DOMException("The operation was aborted due to timeout", "TimeoutError");

const fetchMock = vi.fn<(input: URL | string, init?: RequestInit) => Promise<Response>>();

/** Runs a call to completion while fake timers fast-forward backoff and rate-limit sleeps. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  const guarded = promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await vi.runAllTimersAsync();
  const result = await guarded;
  if (!result.ok) throw result.error;
  return result.value;
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-20T12:00:00.000Z") });
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  resetRateLimiterForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("ygoGet transport", () => {
  it("sends a timeout signal and JSON accept header with every request", async () => {
    fetchMock.mockResolvedValue(json(fixture("cardinfo-id-46986414.json")));
    await settle(ygoGet("cardinfo.php", { id: "46986414" }));
    const init = fetchMock.mock.calls[0]![1]!;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.headers).toMatchObject({ Accept: "application/json" });
  });

  it("retries a 429 honouring Retry-After and succeeds on the next attempt", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("slow down", { status: 429, headers: { "retry-after": "2" } }))
      .mockResolvedValueOnce(json(fixture("cardinfo-id-46986414.json")));
    const start = Date.now();
    const result = await settle(ygoGet("cardinfo.php", { id: "46986414" }));
    expect(result.kind).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(Date.now() - start).toBeGreaterThanOrEqual(2000);
  });

  it("caps an excessive Retry-After at 10 seconds", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("", { status: 429, headers: { "retry-after": "3600" } }))
      .mockResolvedValueOnce(json(fixture("cardinfo-id-46986414.json")));
    const start = Date.now();
    await settle(ygoGet("cardinfo.php", { id: "46986414" }));
    expect(Date.now() - start).toBeLessThan(11_000);
  });

  it("throws CatalogUnavailableError after three 429 responses", async () => {
    fetchMock.mockImplementation(async () => new Response("", { status: 429 }));
    await expect(settle(ygoGet("cardinfo.php", { id: "1" }))).rejects.toBeInstanceOf(CatalogUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws CatalogUnavailableError after repeated timeouts", async () => {
    fetchMock.mockImplementation(async () => {
      throw timeoutError();
    });
    const error = await settle(ygoGet("cardinfo.php", { id: "1" })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CatalogUnavailableError);
    expect((error as Error).cause).toMatchObject({ name: "TimeoutError" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("recovers when a network error is followed by a good response", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(json(fixture("cardinfo-id-46986414.json")));
    expect((await settle(ygoGet("cardinfo.php", { id: "46986414" }))).kind).toBe("ok");
  });

  it("does not retry malformed JSON and reports it as unavailable", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Cloudflare</html>", { status: 200 }));
    await expect(settle(ygoGet("cardinfo.php", { id: "1" }))).rejects.toThrow(/invalid JSON/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a non-'no match' 4xx as unavailable rather than not found", async () => {
    fetchMock.mockResolvedValue(json({ error: "Bad parameter" }, 400));
    await expect(settle(ygoGet("cardinfo.php", { id: "1" }))).rejects.toBeInstanceOf(CatalogUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps the provider's 'no card matching' error to no_match", async () => {
    fetchMock.mockResolvedValue(json(fixture("error-no-match.json"), 400));
    expect(await settle(ygoGet("cardinfo.php", { id: "1" }))).toEqual({ kind: "no_match" });
  });
});

describe("catalog API under provider failure", () => {
  it("getCard returns unavailable on persistent 429", async () => {
    fetchMock.mockImplementation(async () => new Response("", { status: 429 }));
    expect(await settle(catalog.getCard(46986414))).toEqual({ ok: false, error: "unavailable" });
  });

  it("getCard returns unavailable on persistent timeouts", async () => {
    fetchMock.mockImplementation(async () => {
      throw timeoutError();
    });
    expect(await settle(catalog.getCard(46986414))).toEqual({ ok: false, error: "unavailable" });
  });

  it("searchCards by set code returns unavailable (not an empty result) on 5xx", async () => {
    fetchMock.mockImplementation(async () => new Response("bad gateway", { status: 502 }));
    expect(await settle(catalog.searchCards({ q: "LOB-005" }))).toEqual({ ok: false, error: "unavailable" });
  });

  it("searchCards by name returns unavailable on malformed JSON", async () => {
    fetchMock.mockResolvedValue(new Response("{not json", { status: 200 }));
    expect(await settle(catalog.searchCards({ q: "dark magician" }))).toEqual({ ok: false, error: "unavailable" });
  });

  it("returns unavailable when a 200 response has an unexpected shape", async () => {
    fetchMock.mockResolvedValue(json({ unexpected: true }));
    expect(await settle(catalog.searchCards({ q: "dark magician" }))).toEqual({ ok: false, error: "unavailable" });
    expect(await settle(catalog.listSets())).toEqual({ ok: false, error: "unavailable" });
  });

  it("lookupBySetCode distinguishes not found from unavailable", async () => {
    fetchMock.mockResolvedValueOnce(json(fixture("cardsetsinfo-no-match.json")));
    expect(await settle(catalog.lookupBySetCode("ZZZ-999"))).toEqual({ ok: false, error: "not_found" });

    fetchMock.mockImplementation(async () => new Response("", { status: 503 }));
    expect(await settle(catalog.lookupBySetCode("LOB-005"))).toEqual({ ok: false, error: "unavailable" });
  });

  it("getSetCards returns unavailable when the set list cannot be fetched", async () => {
    fetchMock.mockImplementation(async () => new Response("", { status: 500 }));
    expect(await settle(catalog.getSetCards("LOB"))).toEqual({ ok: false, error: "unavailable" });
  });

  it("getCardsByIds yields an empty map instead of throwing when the provider is down", async () => {
    fetchMock.mockImplementation(async () => new Response("", { status: 503 }));
    const map = await settle(catalog.getCardsByIds([46986414, 89631139]));
    expect(map.size).toBe(0);
  });
});
