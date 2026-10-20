import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import type { PriceQuote } from "@/types";

/** Renders a §12 price quote: printing price, card price with "Estimated", or "Price Unavailable". */
export function PriceLabel({ quote, className }: { quote: PriceQuote; className?: string }) {
  if (quote.basis === "unavailable") {
    return <span className={cn("text-sm text-muted-foreground", className)}>Price Unavailable</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 tabular-nums", className)} title={`Source: ${quote.source}`}>
      {formatMoney(quote.amount)}
      {quote.basis === "card-estimate" && <Badge variant="secondary">Estimated</Badge>}
    </span>
  );
}
