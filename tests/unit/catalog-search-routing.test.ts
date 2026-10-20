import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { classifyQuery } from "@/lib/ygoprodeck/query";

vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(__dirname, "../fixtures/ygoprodeck", name), "utf8"));

describe("classifyQuery", () => {
  it("routes numeric input to an id lookup, stripping leading zeros", () => {
    expect(classifyQuery("46986414")).toEqual({ kind: "id", id: 46986414 });
    expect(classifyQuery(" 0046986414 ")).toEqual({ kind: "id", id: 46986414 });
  });

  it("routes printing codes to a set-code lookup", () => {
    expect(classifyQuery("LOB-005")).toEqual({ kind: "setCode", setCode: "LOB-005" });
    expect(classifyQuery("lob-en005")).toEqual({ kind: "setCode", setCode: "LOB-EN005" });
    expect(classifyQuery("CT13-EN003")).toEqual({ kind: "setCode", setCode: "CT13-EN003" });
  });

  it("routes everything else to a name search", () => {
    expect(classifyQuery("Dark  Magician")).toEqual({ kind: "name", name: "Dark Magician" });
    expect(classifyQuery("12")).toEqual({ kind: "name", name: "12" });
    expect(classifyQuery("Blue-Eyes")).toEqual({ kind: "name", name: "Blue-Eyes" });
    expect(classifyQuery("000")).toEqual({ kind: "name", name: "000" });
  });

  it("detects empty input", () => {
    expect(classifyQuery("   ")).toEqual({ kind: "empty" });
  });
});

// ---------- searchCards / lookups against a stubbed provider (no network) ----------

const NO_MATCH = fixture("error-no-match.json");
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function altArtEcho(): unknown {
  const env = structuredClone(fixture("cardinfo-id-46986414.json")) as { data: { id: number; card_images: { id: number }[] }[] };
  env.data[0]!.id = 46986421;
  env.data[0]!.card_images = [{ ...env.data[0]!.card_images[0]!, id: 46986421 }];
  return env;
}

const calls: URL[] = [];
function provider(url: URL): Response {
  const p = url.searchParams;
  if (url.pathname.endsWith("/cardsetsinfo.php")) {
    return p.get("setcode") === "LOB-005" ? json(fixture("cardsetsinfo-LOB-005.json")) : json(fixture("cardsetsinfo-no-match.json"));
  }
  if (url.pathname.endsWith("/cardsets.php")) return json(fixture("cardsets.json"));
  if (url.pathname.endsWith("/cardinfo.php")) {
    if (p.get("id") === "46986414") return json(fixture("cardinfo-id-46986414.json"));
    if (p.get("id") === "46986421") return json(altArtEcho());
    if (p.get("name")?.split("|").includes("Dark Magician")) return json(fixture("cardinfo-name-dark-magician.json"));
    if (p.get("cardset") === "Legend of Blue Eyes White Dragon") return json(fixture("cardinfo-cardset-lob.json"));
    if (p.get("fname") === "dark magician") return json(fixture("cardinfo-fname-page.json"));
    if (p.get("fname") === "explode") return new Response("oops", { status: 503 });
    return json(NO_MATCH, 400);
  }
  return new Response("not found", { status: 404 });
}

describe("searchCards routing", () => {
  beforeEach(async () => {
    calls.length = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string) => {
        const url = new URL(String(input));
        calls.push(url);
        return provider(url);
      }),
    );
    const client = await import("@/lib/ygoprodeck/client");
    client.resetRateLimiterForTests();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("id → cardinfo?id, canonicalized via exact name", async () => {
    const { searchCards } = await import("@/lib/ygoprodeck");
    const res = await searchCards({ q: "46986414" });
    expect(res).toEqual({ ok: true, data: [expect.objectContaining({ id: 46986414, name: "Dark Magician" })] });
    expect(calls[0]!.searchParams.get("id")).toBe("46986414");
  });

  it("set code → cardsetsinfo → canonical card even when the provider echoes an alt-art id", async () => {
    const { searchCards, lookupBySetCode } = await import("@/lib/ygoprodeck");
    const res = await searchCards({ q: "lob-005" });
    expect(res.ok && res.data.map((c) => c.id)).toEqual([46986414]);
    expect(calls[0]!.pathname).toMatch(/cardsetsinfo\.php$/);
    expect(calls[0]!.searchParams.get("setcode")).toBe("LOB-005");

    const direct = await lookupBySetCode("LOB-005");
    expect(direct.ok && direct.data.id).toBe(46986414);
  });

  it("name → cardinfo?fname with num/offset pagination", async () => {
    const { searchCards } = await import("@/lib/ygoprodeck");
    const res = await searchCards({ q: "dark magician", limit: 3 });
    expect(res.ok && res.data).toHaveLength(3);
    expect(calls[0]!.searchParams.get("fname")).toBe("dark magician");
    expect(calls[0]!.searchParams.get("num")).toBe("3");
    expect(calls[0]!.searchParams.get("offset")).toBe("0");
  });

  it("maps the provider's 'no card matching' 400 to an empty result / not_found", async () => {
    const { searchCards, getCard, lookupBySetCode } = await import("@/lib/ygoprodeck");
    expect(await searchCards({ q: "zzzz nothing" })).toEqual({ ok: true, data: [] });
    expect(await searchCards({ q: "99999999" })).toEqual({ ok: true, data: [] });
    expect(await getCard(99999999)).toEqual({ ok: false, error: "not_found" });
    expect(await lookupBySetCode("ZZZ-999")).toEqual({ ok: false, error: "not_found" });
  });

  it("maps persistent 5xx to unavailable after retries", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 200 });
    const { searchCards } = await import("@/lib/ygoprodeck");
    expect(await searchCards({ q: "explode" })).toEqual({ ok: false, error: "unavailable" });
    expect(calls.filter((u) => u.searchParams.get("fname") === "explode")).toHaveLength(3);
  });

  it("getCardsByIds dedupes and keys by requested id", async () => {
    const { getCardsByIds } = await import("@/lib/ygoprodeck");
    const map = await getCardsByIds([46986414, 46986414]);
    expect([...map.keys()]).toEqual([46986414]);
    expect(calls[0]!.searchParams.get("id")).toBe("46986414");
  });

  it("getSetCards resolves code → name, canonicalizes alt-art ids and orders by printing code", async () => {
    const { getSetCards } = await import("@/lib/ygoprodeck");
    const res = await getSetCards("lob");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.set.name).toBe("Legend of Blue Eyes White Dragon");
    // Provider reports Dark Magician as 36996508 in cardset responses; canonical id is 46986414.
    expect(res.data.cards.map((c) => c.id)).toEqual([89631139, 46986414, 91152256]);
    expect(calls.find((u) => u.searchParams.has("cardset"))!.searchParams.get("cardset")).toBe(
      "Legend of Blue Eyes White Dragon",
    );
    expect(await getSetCards("NOPE")).toEqual({ ok: false, error: "not_found" });
  });
});
