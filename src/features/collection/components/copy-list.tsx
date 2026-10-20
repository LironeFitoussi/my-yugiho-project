import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import type { CardCopy } from "@/types";

import { CopyFormDialog, type PrintingOption } from "./copy-form-dialog";
import { DeleteCopyButton } from "./delete-copy-button";

/** One row per physical copy, each with its own edit and delete controls. */
export function CopyList({ copies, printings }: { copies: CardCopy[]; printings: PrintingOption[] }) {
  return (
    <ol className="divide-y rounded-xl ring-1 ring-foreground/10">
      {copies.map((copy, index) => (
        <li key={copy.copyId} className="flex flex-wrap items-start justify-between gap-3 p-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Copy {index + 1}</span>
              <Badge variant="secondary">{copy.condition}</Badge>
              {copy.purchaseId ? <Badge variant="outline">Linked to purchase</Badge> : null}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
              <dt className="text-muted-foreground">Printing</dt>
              <dd>
                {copy.printingSetCode
                  ? [copy.printingSetCode, copy.printingRarity].filter(Boolean).join(" · ")
                  : "Not recorded"}
              </dd>
              <dt className="text-muted-foreground">Paid</dt>
              <dd>{copy.purchasePrice ? formatMoney(copy.purchasePrice) : "—"}</dd>
              <dt className="text-muted-foreground">Acquired</dt>
              <dd>{copy.acquiredAt ?? "—"}</dd>
            </dl>
            {copy.notes ? <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{copy.notes}</p> : null}
          </div>
          <div className="flex items-start gap-2">
            <CopyFormDialog cardId={copy.cardId} cardName={copy.cardName} printings={printings} copy={copy} />
            <DeleteCopyButton cardId={copy.cardId} copyId={copy.copyId} cardName={copy.cardName} />
          </div>
        </li>
      ))}
    </ol>
  );
}
