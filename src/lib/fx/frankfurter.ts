import "server-only";

import { z } from "zod";

/**
 * Frankfurter v2 single-pair endpoint, restricted to the ECB provider (v2 otherwise blends
 * many central banks). Response: {"date":"YYYY-MM-DD","base":"USD","quote":"ILS","rate":3.1077}
 */
export const FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v2";
export const FRANKFURTER_SOURCE = "frankfurter (ECB)";
const TIMEOUT_MS = 5000;

const rateResponseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  base: z.string(),
  quote: z.string(),
  rate: z.number().positive(),
});

export type ProviderRate = { base: string; quote: string; rate: string; rateDate: string };

/** Fetches the latest base→quote rate. Throws on network error, timeout, non-2xx, or bad shape. */
export async function fetchLatestRate(base: string, quote: string): Promise<ProviderRate> {
  const url = `${FRANKFURTER_BASE_URL}/rate/${encodeURIComponent(base)}/${encodeURIComponent(quote)}?providers=ecb`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`);
  const data = rateResponseSchema.parse(await res.json());
  if (data.base !== base || data.quote !== quote) {
    throw new Error(`Frankfurter returned ${data.base}/${data.quote}, expected ${base}/${quote}`);
  }
  // Keep the rate as a decimal string; it is never used in float arithmetic.
  return { base, quote, rate: String(data.rate), rateDate: data.date };
}
