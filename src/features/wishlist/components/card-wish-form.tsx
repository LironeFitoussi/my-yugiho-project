"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage } from "@/features/products/components/fields";

import { updateCardWishAction } from "../actions";
import { initialWishlistActionState, MAX_DESIRED_QUANTITY } from "../schemas";

/** Edit desired quantity and notes for a card wish. */
export function CardWishForm({
  cardId,
  desiredQuantity,
  notes,
}: {
  cardId: number;
  desiredQuantity: number;
  notes: string;
}) {
  const [state, formAction, pending] = useActionState(updateCardWishAction, initialWishlistActionState);
  const fe = state.fieldErrors ?? {};
  const prefix = `wish-card-${cardId}`;
  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="cardId" value={cardId} />
      <Field id={`${prefix}-qty`} label="Copies wanted" errors={fe.desiredQuantity}>
        <Input
          id={`${prefix}-qty`}
          name="desiredQuantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DESIRED_QUANTITY}
          required
          defaultValue={desiredQuantity}
          className="h-11 w-28"
        />
      </Field>
      <Field id={`${prefix}-notes`} label="Notes" errors={fe.notes}>
        <Textarea id={`${prefix}-notes`} name="notes" maxLength={2000} defaultValue={notes} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="h-11 px-4" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <FormMessage
          error={state.ok === false ? state.message : undefined}
          success={state.ok ? state.message : undefined}
        />
      </div>
    </form>
  );
}
