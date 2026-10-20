// Pure selection of which classic sets the dashboard computes completion for (bounded, PRD §14).
import type { CardSet } from "@/types";

export const DASHBOARD_SET_LIMIT = 6;

/** "LOB-005" → "LOB"; null for empty codes. */
export function setPrefix(printingSetCode: string | null): string | null {
  const prefix = printingSetCode?.trim().split("-")[0]?.toUpperCase();
  return prefix ? prefix : null;
}

/**
 * Picks at most `limit` classic sets: first those whose code matches the printings the user
 * recorded (most copies first), then the earliest-released classic sets to fill the rest.
 */
export function chooseDashboardSets(
  sets: CardSet[],
  printingSetCodes: (string | null)[],
  limit = DASHBOARD_SET_LIMIT,
): CardSet[] {
  const classic = sets
    .filter((s) => s.isClassic)
    .sort((a, b) => (a.releaseDate ?? "9999").localeCompare(b.releaseDate ?? "9999") || a.code.localeCompare(b.code));

  const copiesByPrefix = new Map<string, number>();
  for (const code of printingSetCodes) {
    const prefix = setPrefix(code);
    if (prefix) copiesByPrefix.set(prefix, (copiesByPrefix.get(prefix) ?? 0) + 1);
  }

  const matched = classic
    .filter((s) => copiesByPrefix.has(s.code))
    .sort((a, b) => (copiesByPrefix.get(b.code) ?? 0) - (copiesByPrefix.get(a.code) ?? 0));
  const rest = classic.filter((s) => !copiesByPrefix.has(s.code));
  return [...matched, ...rest].slice(0, Math.max(0, limit));
}
