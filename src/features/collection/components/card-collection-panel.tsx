// Rendered by the Catalog agent on /cards/[id]: shows owned copies of this card and an "Add copy" form.
import type { Card } from "@/types";

import { listCopiesForCard } from "../queries";
import { CopyFormDialog, type PrintingOption } from "./copy-form-dialog";
import { CopyList } from "./copy-list";

export type CardCollectionPanelProps = {
  card: Pick<Card, "id" | "name" | "printings">;
};

export async function CardCollectionPanel({ card }: CardCollectionPanelProps) {
  // listCopiesForCard runs requireOwner() itself.
  const copies = await listCopiesForCard(card.id);
  const printings: PrintingOption[] = card.printings.map((p) => ({
    setCode: p.setCode,
    rarity: p.rarity,
    setName: p.setName,
  }));

  return (
    <section aria-labelledby="your-copies" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="your-copies" className="text-lg font-semibold">
            Your copies ({copies.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Each physical copy is tracked separately. Duplicates are fine — they don&apos;t change set completion.
          </p>
        </div>
        <CopyFormDialog cardId={card.id} cardName={card.name} printings={printings} />
      </div>
      {copies.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          You don&apos;t own a copy of this card yet.
        </p>
      ) : (
        <CopyList copies={copies} printings={printings} />
      )}
    </section>
  );
}
