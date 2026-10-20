import { CURRENCIES, type Currency, formatMoney } from "@/lib/money";

/** Per-currency totals side by side — never summed across currencies. */
export function CurrencyTotals({ label, totals }: { label: string; totals: Record<Currency, number> }) {
  const shown = CURRENCIES.filter((c) => totals[c] !== 0);
  return (
    <div className="grid gap-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      {shown.length === 0 ? (
        <p className="text-xl font-semibold">—</p>
      ) : (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {shown.map((c) => (
            <li key={c} className="text-xl font-semibold tabular-nums">
              {formatMoney({ amountMinor: totals[c], currency: c })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
