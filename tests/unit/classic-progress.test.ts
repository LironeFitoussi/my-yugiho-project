import { beforeEach, describe, expect, it, vi } from "vitest";

const listOwnedCardIds = vi.fn();

vi.mock("@/features/collection/queries", () => ({ listOwnedCardIds }));

async function load() {
  vi.resetModules();
  return (await import("@/features/progress/queries")).getClassicProgress;
}

describe("getClassicProgress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts unique pool cards only; non-pool cards and duplicate artworks never add", async () => {
    // Blue-Eyes, Flame Swordsman + its alternate art (one identity), and a card outside the pool.
    listOwnedCardIds.mockResolvedValue(new Set([89631139, 45231177, 45231178, 1]));

    expect(await (await load())()).toMatchObject({ owned: 2, total: 1416, percent: 0.1, unlinked: 3 });
  });

  it("starts at zero with an empty collection", async () => {
    listOwnedCardIds.mockResolvedValue(new Set());

    expect(await (await load())()).toMatchObject({ owned: 0, total: 1416, percent: 0 });
  });
});
