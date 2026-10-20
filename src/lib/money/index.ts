import Decimal from "decimal.js";
import { z } from "zod";

/** Supported currencies (PRD §8, §11). Amounts are stored in their original currency. */
export const CURRENCIES = ["USD", "ILS"] as const;
export const currencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;

/** Integer minor units (cents / agorot). Never a float. */
export type Money = { amountMinor: number; currency: Currency };

export const moneySchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: currencySchema,
});

const MINOR_DIGITS: Record<Currency, number> = { USD: 2, ILS: 2 };

/**
 * Parses user input ("12.5", "1,000.00", "0.1") into integer minor units using string math.
 * Returns null for empty or invalid input, negative values, or more decimals than the currency allows.
 */
export function parseMoneyInput(input: string, currency: Currency): Money | null {
  const cleaned = input.trim().replace(/,/g, "");
  if (cleaned === "") return null;
  const match = /^(\d+)(?:\.(\d*))?$/.exec(cleaned);
  if (!match) return null;
  const digits = MINOR_DIGITS[currency];
  const [, whole, fraction = ""] = match;
  if (fraction.length > digits) return null;
  const amountMinor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0") || "0");
  if (!Number.isSafeInteger(amountMinor)) return null;
  return { amountMinor, currency };
}

/** Zod schema for a money form field: a decimal string → Money. */
export function moneyInputSchema(currency: Currency) {
  return z.string().transform((value, ctx) => {
    const money = parseMoneyInput(value, currency);
    if (!money) {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount, e.g. 12.50" });
      return z.NEVER;
    }
    return money;
  });
}

export function zero(currency: Currency): Money {
  return { amountMinor: 0, currency };
}

/** Adds same-currency amounts. Throws on mixed currencies — never sum USD with ILS directly. */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error(`Cannot add ${a.currency} to ${b.currency}`);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): { amountMinor: number; currency: Currency } {
  if (a.currency !== b.currency) throw new Error(`Cannot subtract ${b.currency} from ${a.currency}`);
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

/** Sums amounts grouped per currency. */
export function sumByCurrency(amounts: Money[]): Record<Currency, number> {
  const totals: Record<Currency, number> = { USD: 0, ILS: 0 };
  for (const m of amounts) totals[m.currency] += m.amountMinor;
  return totals;
}

/** A USD→ILS (or reverse) exchange rate record. `rate` is a decimal string: 1 base = rate quote. */
export type FxRate = {
  base: Currency;
  quote: Currency;
  rate: string;
  rateDate: string;
  fetchedAt: string;
  source: string;
};

/**
 * Converts using decimal math, rounding once (half-even) at the end.
 * Accepts a rate in either direction; throws if the rate does not cover the pair.
 */
export function convert(money: Money, to: Currency, fx: FxRate): Money {
  if (money.currency === to) return money;
  let factor: Decimal;
  if (fx.base === money.currency && fx.quote === to) factor = new Decimal(fx.rate);
  else if (fx.base === to && fx.quote === money.currency) factor = new Decimal(1).div(fx.rate);
  else throw new Error(`Rate ${fx.base}/${fx.quote} cannot convert ${money.currency}→${to}`);
  const scale = new Decimal(10).pow(MINOR_DIGITS[to] - MINOR_DIGITS[money.currency]);
  const amountMinor = new Decimal(money.amountMinor)
    .mul(factor)
    .mul(scale)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN)
    .toNumber();
  return { amountMinor, currency: to };
}

/** Minor units → decimal string for form default values ("12.50"). */
export function toDecimalString(money: Money): string {
  return new Decimal(money.amountMinor).div(10 ** MINOR_DIGITS[money.currency]).toFixed(MINOR_DIGITS[money.currency]);
}

export function formatMoney(money: Money, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: money.currency }).format(
    new Decimal(money.amountMinor).div(10 ** MINOR_DIGITS[money.currency]).toNumber(),
  );
}
