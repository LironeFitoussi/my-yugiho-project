"use client";

import { Trash2Icon } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { removeWishAction } from "../actions";
import { initialWishlistActionState } from "../schemas";

/** Two-step remove (tap, then confirm). */
export function RemoveWishButton({ kind, id, label }: { kind: "CARD" | "PRODUCT"; id: string | number; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(removeWishAction, initialWishlistActionState);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-11 min-w-11 px-3 text-destructive"
        aria-label={`Remove ${label} from wishlist`}
        onClick={() => setConfirming(true)}
      >
        <Trash2Icon aria-hidden />
        <span className="sr-only sm:not-sr-only">Remove</span>
      </Button>
    );
  }
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <Button type="button" variant="ghost" className="h-11 px-3" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      <Button type="submit" variant="destructive" className="h-11 px-3" disabled={pending}>
        {pending ? "Removing…" : "Confirm remove"}
      </Button>
      {state.ok === false && state.message ? (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
