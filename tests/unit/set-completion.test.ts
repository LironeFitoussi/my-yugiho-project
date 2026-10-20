import { describe, expect, it } from "vitest";

import { computeCompletion } from "@/features/sets/completion";

const range = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i);

describe("computeCompletion", () => {
  it("50-card set with 35 owned is 70%", () => {
    const set = range(1000, 50);
    const result = computeCompletion(set, new Set(set.slice(0, 35)));
    expect(result).toMatchObject({ total: 50, owned: 35, percent: 70 });
    expect(result.missing).toEqual(set.slice(35));
    expect(result.ownedIds).toEqual(set.slice(0, 35));
  });

  it("duplicate copies and duplicate ids never increase completion", () => {
    const set = [1, 2, 3, 4];
    // Owned ids derived from copies: three copies of card 1 collapse to one id.
    const copies = [1, 1, 1, 2];
    const result = computeCompletion([...set, 1, 2], new Set(copies));
    expect(result).toMatchObject({ total: 4, owned: 2, percent: 50 });
  });

  it("ownership from another printing or reprint counts (identity is the card id)", () => {
    // Card 89631139 owned via a reprint printing, not the set's original printing.
    const result = computeCompletion([89631139, 46986414], new Set([89631139]));
    expect(result).toMatchObject({ total: 2, owned: 1, percent: 50, missing: [46986414] });
  });

  it("empty set is 0% with nothing missing", () => {
    expect(computeCompletion([], new Set([1, 2]))).toEqual({ total: 0, owned: 0, ownedIds: [], missing: [], percent: 0 });
  });

  it("owned ids not in the set are ignored", () => {
    const result = computeCompletion([1, 2], new Set([2, 99, 100]));
    expect(result).toMatchObject({ total: 2, owned: 1, percent: 50 });
  });

  it("floors to one decimal with integer math", () => {
    expect(computeCompletion([1, 2, 3], new Set([1, 2])).percent).toBe(66.6);
    expect(computeCompletion([1, 2, 3], new Set([1, 2, 3])).percent).toBe(100);
  });
});
