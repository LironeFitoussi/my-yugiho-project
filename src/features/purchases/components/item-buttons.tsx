"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/features/products/components/fields";
import type { PurchaseItemKind } from "@/types";

import { deletePurchaseAction, type PurchaseActionState, removePurchaseItemAction } from "../actions";

const initialState: PurchaseActionState = {};

/** Removes a line and unlinks its copy/product. The copy itself stays in the collection. */
export function RemoveItemButton({
  purchaseId,
  kind,
  refId,
}: {
  purchaseId: string;
  kind: PurchaseItemKind;
  refId: string;
}) {
  const [state, formAction, pending] = useActionState(removePurchaseItemAction, initialState);
  return (
    <form action={formAction} className="grid justify-items-end gap-1">
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="refId" value={refId} />
      <Button type="submit" variant="outline" disabled={pending} className="h-11 px-3">
        {pending ? "Removing…" : kind === "MISC" ? "Remove" : "Unlink"}
      </Button>
      <FormMessage error={state.error} />
    </form>
  );
}

export function DeletePurchaseButton({ purchaseId, disabled }: { purchaseId: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(deletePurchaseAction, initialState);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Delete this purchase? This cannot be undone.")) e.preventDefault();
      }}
      className="grid gap-1"
    >
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <Button type="submit" variant="destructive" disabled={pending || disabled} className="h-11 px-4">
        {pending ? "Deleting…" : "Delete purchase"}
      </Button>
      <FormMessage error={state.error} />
    </form>
  );
}
