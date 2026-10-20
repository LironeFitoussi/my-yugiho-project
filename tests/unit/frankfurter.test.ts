import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchLatestRate } from "@/lib/fx/frankfurter";

const fetchMock = vi.fn<(input: URL | string, init?: RequestInit) => Promise<Response>>();
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("fetchLatestRate (Frankfurter)", () => {
  it("returns the rate as a decimal string with its rate date", async () => {
    fetchMock.mockResolvedValue(ok({ date: "2026-10-20", base: "USD", quote: "ILS", rate: 3.1077 }));
    expect(await fetchLatestRate("USD", "ILS")).toEqual({ base: "USD", quote: "ILS", rate: "3.1077", rateDate: "2026-10-20" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://api.frankfurter.dev/v2/rate/USD/ILS?providers=ecb");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.cache).toBe("no-store");
  });

  it.each([429, 500, 503, 404])("throws on HTTP %i", async (status) => {
    fetchMock.mockResolvedValue(new Response("nope", { status }));
    await expect(fetchLatestRate("USD", "ILS")).rejects.toThrow(`Frankfurter responded ${status}`);
  });

  it("propagates a timeout", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    await expect(fetchLatestRate("USD", "ILS")).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("throws on malformed JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));
    await expect(fetchLatestRate("USD", "ILS")).rejects.toThrow();
  });

  it.each([
    ["a string rate", { date: "2026-10-20", base: "USD", quote: "ILS", rate: "3.1" }],
    ["a zero rate", { date: "2026-10-20", base: "USD", quote: "ILS", rate: 0 }],
    ["a negative rate", { date: "2026-10-20", base: "USD", quote: "ILS", rate: -3.1 }],
    ["a bad date", { date: "20/10/2026", base: "USD", quote: "ILS", rate: 3.1 }],
    ["the v1 shape", { amount: 1, base: "USD", date: "2026-10-20", rates: { ILS: 3.1 } }],
  ])("rejects %s", async (_label, body) => {
    fetchMock.mockResolvedValue(ok(body));
    await expect(fetchLatestRate("USD", "ILS")).rejects.toThrow();
  });

  it("rejects a response for a different currency pair", async () => {
    fetchMock.mockResolvedValue(ok({ date: "2026-10-20", base: "EUR", quote: "ILS", rate: 3.9 }));
    await expect(fetchLatestRate("USD", "ILS")).rejects.toThrow(/expected USD\/ILS/);
  });
});
