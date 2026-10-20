"use client";

import { Trash2Icon } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { deleteCopyAction } from "../actions";
import { initialCopyActionState, type CopyActionState } from "../schemas";

/** Two-step delete (tap, then confirm) — no hover-only affordances. */
export function DeleteCopyButton({ cardId, copyId, cardName }: { cardId: number; copyId: string; cardName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: CopyActionState, formData: FormData) => {
    const result = await deleteCopyAction(prev, formData);
    if (result.ok) toast.success(result.message ?? "Copy deleted.");
    else setConfirming(false);
    return result;
  }, initialCopyActionState);

  return (
    <div className="flex flex-col items-end gap-1">
      {confirming ? (
        <form action={formAction} className="flex gap-2">
          <input type="hidden" name="cardId" value={cardId} />
          <input type="hidden" name="copyId" value={copyId} />
          <Button type="button" variant="ghost" className="h-11 px-3" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" className="h-11 px-3" disabled={pending}>
            {pending ? "Deleting…" : "Confirm delete"}
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="h-11 min-w-11 px-3 text-destructive"
          aria-label={`Delete this copy of ${cardName}`}
          onClick={() => setConfirming(true)}
        >
          <Trash2Icon />
          <span className="sr-only sm:not-sr-only">Delete</span>
        </Button>
      )}
      {!state.ok && state.message ? (
        <p role="alert" className="max-w-56 text-right text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
