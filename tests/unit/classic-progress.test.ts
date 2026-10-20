import { beforeEach, describe, expect, it, vi } from "vitest";

const listSets = vi.fn();
const getSetCards = vi.fn();
const listOwnedCardIds = vi.fn();

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/lib/ygoprodeck", () => ({ listSets, getSetCards }));
vi.mock("@/lib/ygoprodeck/cached", () => ({ CATALOG_TAG: "ygoprodeck" }));
vi.mock("@/features/collection/queries", () => ({ listOwnedCardIds }));

const set = (code: string, isClassic: boolean) => ({ code, name: code, cardCount: 0, releaseDate: null, imageUrl: null, isClassic });
const cards = (...ids: number[]) => ({ ok: true, data: { set: set("X", true), cards: ids.map((id) => ({ id })) } });

async function load() {
  vi.resetModules();
  return (await import("@/features/progress/queries")).getClassicProgress;
}

describe("getClassicProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("counts unique cards across classic sets only; duplicates and reprints count once", async () => {
    listSets.mockResolvedValue({ ok: true, data: [set("LOB", true), set("MRD", true), set("GX1", false)] });
    getSetCards.mockImplementation(async (code: string) => (code === "LOB" ? cards(1, 2, 3) : cards(3, 4)));
    listOwnedCardIds.mockResolvedValue(new Set([1, 3, 99]));

    const progress = await (await load())();

    expect(getSetCards).toHaveBeenCalledTimes(2); // non-classic set never fetched
    expect(progress).toMatchObject({ ok: true, owned: 2, total: 4, percent: 50, setCount: 2 });
  });

  it("skips sets the provider no longer has", async () => {
    listSets.mockResolvedValue({ ok: true, data: [set("LOB", true), set("OLD", true)] });
    getSetCards.mockImplementation(async (code: string) =>
      code === "OLD" ? { ok: false, error: "not_found" } : cards(1, 2),
    );
    listOwnedCardIds.mockResolvedValue(new Set([2]));

    expect(await (await load())()).toMatchObject({ ok: true, owned: 1, total: 2 });
  });

  it("reports unavailable instead of a partial total when any set fails", async () => {
    listSets.mockResolvedValue({ ok: true, data: [set("LOB", true), set("MRD", true)] });
    getSetCards.mockImplementation(async (code: string) =>
      code === "MRD" ? { ok: false, error: "unavailable" } : cards(1, 2),
    );
    listOwnedCardIds.mockResolvedValue(new Set([1]));

    expect(await (await load())()).toEqual({ ok: false });
  });

  it("reports unavailable when the set list can't be loaded", async () => {
    listSets.mockResolvedValue({ ok: false, error: "unavailable" });
    listOwnedCardIds.mockResolvedValue(new Set());

    expect(await (await load())()).toEqual({ ok: false });
  });
});
