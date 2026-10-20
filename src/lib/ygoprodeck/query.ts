// Pure query routing for catalog search (no I/O) — unit-tested.

export type ClassifiedQuery =
  | { kind: "id"; id: number }
  | { kind: "setCode"; setCode: string }
  | { kind: "name"; name: string }
  | { kind: "empty" };

const ID_RE = /^\d{3,10}$/;
const SET_CODE_RE = /^[A-Z0-9]{2,5}-[A-Z]{0,2}\d{2,4}$/i;

/**
 * Routes free text to a lookup strategy:
 * - 3–10 digits → card ID / passcode (leading zeros stripped: "0046986414" → 46986414)
 * - "LOB-005", "lob-en005", "CT13-EN003" → printing set code (upper-cased)
 * - anything else → fuzzy name search
 */
export function classifyQuery(raw: string): ClassifiedQuery {
  const q = raw.trim().replace(/\s+/g, " ");
  if (q === "") return { kind: "empty" };
  if (ID_RE.test(q)) {
    const id = Number(q);
    if (Number.isSafeInteger(id) && id > 0) return { kind: "id", id };
    return { kind: "name", name: q };
  }
  if (SET_CODE_RE.test(q)) return { kind: "setCode", setCode: q.toUpperCase() };
  return { kind: "name", name: q };
}
