import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEALED_PRODUCTS_VALUATION_NOTE } from "@/features/pricing";
import { FxNote } from "@/features/pricing/components/fx-note";
import { getPortfolio } from "@/features/portfolio/queries";
import { CurrencyTotals } from "@/features/purchases/components/currency-totals";
import { cn } from "@/lib/utils";
import { type Currency, currencySchema, formatMoney } from "@/lib/money";
import { requireOwner } from "@/lib/auth";

/** Deterministic timestamp: "YYYY-MM-DD HH:MM UTC". */
const formatUtc = (iso: string) => `${iso.slice(0, 16).replace("T", " ")} UTC`;

export default async function PortfolioPage({ searchParams }: PageProps<"/portfolio">) {
  await requireOwner();
  const { in: rawIn } = await searchParams;
  const requested = currencySchema.catch("USD").parse(Array.isArray(rawIn) ? rawIn[0] : rawIn);
  const p = await getPortfolio();
  // ILS figures need a rate; without one, everything stays in USD.
  const display: Currency = requested === "ILS" && p.fx ? "ILS" : "USD";

  const marketValue = p.market ? (display === "USD" ? p.market.totalUsd : p.market.totalIls) : null;
  const investedTotal = p.investedIn[display];
  const difference = p.difference[display];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Portfolio"
        description="Total invested versus estimated market value."
        actions={
          <nav aria-label="Display currency" className="flex gap-1 rounded-lg border p-1">
            {(["USD", "ILS"] as const).map((c) => {
              const disabled = c === "ILS" && !p.fx;
              return disabled ? (
                <span key={c} className="inline-flex min-h-11 items-center px-3 text-sm text-muted-foreground opacity-50">
                  {c}
                </span>
              ) : (
                <Link
                  key={c}
                  href={(c === "USD" ? "/portfolio" : "/portfolio?in=ILS") as Route}
                  aria-current={display === c ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium",
                    display === c ? "bg-muted" : "text-muted-foreground",
                  )}
                >
                  {c}
                </Link>
              );
            })}
          </nav>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total invested</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{investedTotal ? formatMoney(investedTotal) : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <CurrencyTotals label="In original currencies" totals={p.invested} />
            {!investedTotal ? (
              <p className="text-xs text-muted-foreground">
                A combined {display} total needs an exchange rate; amounts are shown in their original currency.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Estimated market value</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {p.market ? (marketValue ? formatMoney(marketValue) : "—") : "Unavailable"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm text-muted-foreground">
            {p.market ? (
              <>
                <p>
                  {formatMoney(p.market.totalUsd)}
                  {p.market.totalIls ? ` · ${formatMoney(p.market.totalIls)}` : ""}
                </p>
                <p>Cards only, excluding unpriced copies.</p>
              </>
            ) : (
              <p>The card catalog is unavailable right now, so market value can&apos;t be estimated.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Estimated value difference</CardDescription>
            <CardTitle
              className={cn(
                "text-2xl tabular-nums",
                difference && difference.amountMinor > 0 && "text-emerald-600 dark:text-emerald-400",
                difference && difference.amountMinor < 0 && "text-destructive",
              )}
            >
              {difference ? `${difference.amountMinor > 0 ? "+" : ""}${formatMoney(difference)}` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Estimate: market value − total invested, in {display}. Excludes unpriced cards and sealed products.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-1">
        <p className="text-xs text-muted-foreground">
          Prices as of <time dateTime={p.valuedAt}>{formatUtc(p.valuedAt)}</time> · market prices from YGOPRODeck (USD)
        </p>
        <FxNote rate={p.fx} />
      </div>

      {p.market ? (
        <Card>
          <CardHeader>
            <CardTitle>How your cards were priced</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Copies" value={p.counts.copies} />
              <Stat label="Priced by printing" value={p.market.printingCopies} />
              <Stat label={<>Card price <Badge variant="secondary">Estimated</Badge></>} value={p.market.estimatedCopies} />
              <Stat label="Price Unavailable" value={p.market.unpricedCopies} />
            </dl>
            {p.market.unpricedCards.length > 0 ? (
              <div className="grid gap-2">
                <h2 className="font-medium">Unpriced cards (excluded from totals)</h2>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {p.market.unpricedCards.map((c) => (
                    <li key={c.cardId}>
                      <Link
                        href={`/cards/${c.cardId}`}
                        className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                      >
                        {c.cardName}
                        {c.copies > 1 ? ` ×${c.copies}` : ""}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Sealed products</CardTitle>
          <CardDescription>
            {p.counts.products} recorded · {p.counts.sealedProducts} sealed
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{SEALED_PRODUCTS_VALUATION_NOTE}</p>
          <p className="mt-2">Their purchase cost is included in total invested.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: ReactNode; value: number }) {
  return (
    <div className="grid gap-0.5">
      <dt className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
