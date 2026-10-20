// Set completion (PRD §9). Pure — completion counts unique card IDs only (AGENTS.md rule 1):
// duplicate copies never increase it, and owning a card from any printing/reprint counts.

export type SetCompletion = {
  /** Unique card ids in the set. */
  total: number;
  /** Unique set card ids the user owns at least one copy of (any printing). */
  owned: number;
  ownedIds: number[];
  missing: number[];
  /** One decimal, floored, computed with integer math (e.g. 70, 66.6). 0 when the set is empty. */
  percent: number;
};

export function computeCompletion(setCardIds: number[], owned: Set<number>): SetCompletion {
  const unique = [...new Set(setCardIds)];
  const ownedIds: number[] = [];
  const missing: number[] = [];
  for (const id of unique) (owned.has(id) ? ownedIds : missing).push(id);
  const total = unique.length;
  const percent = total === 0 ? 0 : Math.floor((ownedIds.length * 1000) / total) / 10;
  return { total, owned: ownedIds.length, ownedIds, missing, percent };
}
