---
name: money
description: Rules for money — purchase prices, shipping, totals invested, market valuation, USD/ILS conversion, exchange rates, price fallbacks (PRD §8, §10–§12, §14). Use whenever code stores, computes, converts, or displays an amount.
---

# Money and valuation

## Representation
```ts
type Currency = "USD" | "ILS";
type Money = { amountMinor: number; currency: Currency }; // integer cents / agorot
```
- The PRD's copy example shows `"purchasePrice": 12.5`. That's the **input/display** shape. Persist it as `amountMinor: 1250` + `currency`, in the **original currency**.
- Parse user input strings ("12.50") to minor units with string math, never `parseFloat(x) * 100`.
- **No float arithmetic.** Add and subtract integers only. For conversion and percentages, use a decimal library (add one only when needed) and round once at the end with an explicit mode.

## Purchases (§10, §11)
- `subtotal` and `shipping` are separate fields. The total is computed, not stored.
- A purchase can hold several items (`PURCHASE_ITEM`), and each card copy or product is counted in **at most one** purchase, so nothing is double-counted.
- Total invested = sum of purchase totals, per currency (or converted with a timestamped rate). Don't also add copy prices that are already covered by a purchase.
- Buying a product never adds cards to the collection.

## Valuation (§12)
- Price priority: printing-specific price, then the general card price (**Estimated**), then `null` (**Price Unavailable**, excluded from totals, listed as unpriced).
- No condition multipliers. No invented prices.
- **Sealed products vs. cards**: don't value a sealed product's contents as owned cards. Opened-product cards count only as manually added copies.
- Store a valuation timestamp; `PRICE_SNAPSHOT` items keep the history.
- Value difference = estimated market value − total invested, shown only in one currency at a time.

## Currency conversion
- An exchange rate is a record: `{ base, quote, rate (decimal string), fetchedAt (ISO), source }`. The provider call is centralized, cached, and server-only.
- Every converted figure carries the `fetchedAt` of its rate, and the UI shows it.
- Never invent or hardcode a rate. If none is available, show the original currency only.
- Never sum mixed currencies directly.
- Display with `Intl.NumberFormat(locale, { style: "currency", currency })`.

## Tests (§22: purchase calculations, currency conversion, price fallback)
Cover rounding, null exclusion, mixed currencies, shipping separation, double-count prevention, and input parsing ("0.1", "1,000.00", "").
