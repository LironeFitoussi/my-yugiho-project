import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { CardPrinting } from "@/types";

import { isClassicSet } from "../classic";
import { ClassicBadge } from "./catalog-bits";

export function PrintingsTable({ printings }: { printings: CardPrinting[] }) {
  if (printings.length === 0) {
    return <p className="text-sm text-muted-foreground">No TCG printings listed by the catalog.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Set</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Rarity</TableHead>
            <TableHead className="text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {printings.map((p) => (
            <TableRow key={`${p.setCode}|${p.rarity}|${p.setName}`}>
              <TableCell className="max-w-56 whitespace-normal">
                {p.setName} {isClassicSet(p.setCode) ? <ClassicBadge /> : null}
              </TableCell>
              <TableCell className="font-mono text-xs">{p.setCode}</TableCell>
              <TableCell className="whitespace-normal">
                {p.rarity || "—"}
                {p.rarityCode ? <span className="ml-1 text-xs text-muted-foreground">{p.rarityCode}</span> : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {p.price ? formatMoney(p.price) : <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
