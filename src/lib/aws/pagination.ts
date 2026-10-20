import "server-only";

import { z } from "zod";

const keySchema = z.record(z.string(), z.union([z.string(), z.number()]));

export type Page<T> = { items: T[]; cursor: string | null };

export function encodeCursor(key: Record<string, unknown> | undefined): string | null {
  if (!key) return null;
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
}

/**
 * Decodes an opaque cursor and checks it belongs to the partition being queried,
 * so a tampered cursor cannot jump to another partition.
 */
export function decodeCursor(
  cursor: string | null | undefined,
  expected: { attr: "PK" | "GSI1PK"; value: string },
): Record<string, string | number> | undefined {
  if (!cursor) return undefined;
  try {
    const parsed = keySchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
    if (parsed[expected.attr] !== expected.value) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}
