import "server-only";

import { listAllCopies } from "@/features/collection/queries";
import { getSetCompletion } from "@/features/sets/queries";
import type { SetCompletion } from "@/features/sets/completion";
import { requireOwner } from "@/lib/auth";
import { listSets } from "@/lib/ygoprodeck";
import type { CardSet } from "@/types";

import { chooseDashboardSets } from "./set-progress";

export type DashboardSetProgress =
  | { ok: true; sets: { set: CardSet; completion: SetCompletion }[] }
  | { ok: false };

/**
 * Completion for at most DASHBOARD_SET_LIMIT classic sets, top by owned unique cards.
 * Set fetches run sequentially to respect the catalog rate limit (they are cached).
 */
export async function getDashboardSetProgress(): Promise<DashboardSetProgress> {
  await requireOwner();
  const [setsResult, copies] = await Promise.all([listSets(), listAllCopies()]);
  if (!setsResult.ok) return { ok: false };
  const chosen = chooseDashboardSets(
    setsResult.data,
    copies.map((c) => c.printingSetCode),
  );

  const out: { set: CardSet; completion: SetCompletion }[] = [];
  for (const set of chosen) {
    const result = await getSetCompletion(set.code);
    if (result.ok) out.push({ set: result.set, completion: result.completion });
  }
  if (chosen.length > 0 && out.length === 0) return { ok: false };
  out.sort((a, b) => b.completion.owned - a.completion.owned || b.completion.percent - a.completion.percent);
  return { ok: true, sets: out };
}
