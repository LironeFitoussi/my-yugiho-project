import { getPortfolio } from "@/features/portfolio/queries";
import { formatMoney } from "@/lib/money";

import { StatTile, TileGrid } from "./stat-tile";

const formatUtc = (iso: string) => `${iso.slice(0, 16).replace("T", " ")} UTC`;

/** Market value tiles — depend on the catalog and FX rate, so they stream in separately. */
export async function MarketTiles() {
  const p = await getPortfolio();
  const asOf = `Estimate · as of ${formatUtc(p.valuedAt)}`;
  if (!p.market) {
    return (
      <TileGrid>
        <StatTile label="Est. market value (USD)" value="Unavailable" hint="Card catalog is unavailable" href="/portfolio" />
        <StatTile label="Est. market value (ILS)" value="Unavailable" href="/portfolio" />
        <StatTile label="Unpriced cards" value="—" href="/portfolio" />
      </TileGrid>
    );
  }
  return (
    <TileGrid>
      <StatTile label="Est. market value (USD)" value={formatMoney(p.market.totalUsd)} hint={asOf} href="/portfolio" />
      <StatTile
        label="Est. market value (ILS)"
        value={p.market.totalIls ? formatMoney(p.market.totalIls) : "—"}
        hint={p.fx ? `1 USD = ${p.fx.rate} ILS (${p.fx.rateDate})` : "Exchange rate unavailable"}
        href="/portfolio"
      />
      <StatTile
        label="Unpriced cards"
        value={p.market.unpricedCards.length}
        hint="Excluded from value"
        href="/portfolio"
      />
    </TileGrid>
  );
}
