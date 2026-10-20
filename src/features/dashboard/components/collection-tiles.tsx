import { getCollectionCounts } from "@/features/portfolio/queries";
import { CURRENCIES, formatMoney } from "@/lib/money";

import { StatTile, TileGrid } from "./stat-tile";

/** DynamoDB-only tiles: never wait on the catalog or FX provider. */
export async function CollectionTiles() {
  const counts = await getCollectionCounts();
  const invested = CURRENCIES.filter((c) => counts.invested[c] !== 0);
  return (
    <TileGrid>
      <StatTile label="Unique cards" value={counts.uniqueCards} href="/collection" />
      <StatTile label="Physical copies" value={counts.copies} href="/collection" />
      <StatTile label="Purchased products" value={counts.products} href="/products" />
      <StatTile
        label="Total invested"
        href="/portfolio"
        value={
          invested.length === 0 ? (
            "—"
          ) : (
            <ul className="grid gap-0.5">
              {invested.map((c) => (
                <li key={c}>{formatMoney({ amountMinor: counts.invested[c], currency: c })}</li>
              ))}
            </ul>
          )
        }
        hint={invested.length > 1 ? "Per currency, not combined" : undefined}
      />
    </TileGrid>
  );
}
