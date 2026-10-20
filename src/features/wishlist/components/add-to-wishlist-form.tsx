"use client";

import { HeartIcon } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { addCardWishAction } from "../actions";
import { initialWishlistActionState } from "../schemas";

/** One-tap "Add to wishlist" (desired quantity 1; editable on the wishlist page). */
export function AddToWishlistForm({ cardId }: { cardId: number }) {
  const [state, formAction, pending] = useActionState(addCardWishAction, initialWishlistActionState);
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="cardId" value={cardId} />
      <input type="hidden" name="desiredQuantity" value="1" />
      <Button type="submit" variant="outline" className="h-11 px-3" disabled={pending}>
        <HeartIcon aria-hidden />
        {pending ? "Adding…" : "Add to wishlist"}
      </Button>
      {state.ok === false && state.message ? (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
