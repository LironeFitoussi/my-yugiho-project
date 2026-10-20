"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, NativeSelect } from "@/features/products/components/fields";
import { CURRENCIES, toDecimalString } from "@/lib/money";
import type { Purchase } from "@/types";

import { createPurchaseAction, type PurchaseActionState, updatePurchaseAction } from "../actions";

const initialState: PurchaseActionState = {};

/** Create (no `purchase`) or edit a purchase header. The subtotal is never edited here — it comes from items. */
export function PurchaseForm({ purchase, defaultDate }: { purchase?: Purchase; defaultDate?: string }) {
  const [state, formAction, pending] = useActionState(
    purchase ? updatePurchaseAction : createPurchaseAction,
    initialState,
  );
  const prefix = purchase ? `purchase-${purchase.purchaseId}` : "purchase-new";
  const fe = state.fieldErrors ?? {};
  const v = state.values;
  const currencyLocked = purchase ? purchase.itemCount > 0 : false;

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {purchase ? <input type="hidden" name="purchaseId" value={purchase.purchaseId} /> : null}
      <Field id={`${prefix}-date`} label="Date" errors={fe.date}>
        <Input
          id={`${prefix}-date`}
          name="date"
          type="date"
          required
          defaultValue={v?.date ?? purchase?.date ?? defaultDate}
          className="h-11"
        />
      </Field>
      <Field id={`${prefix}-seller`} label="Seller" errors={fe.seller}>
        <Input
          id={`${prefix}-seller`}
          name="seller"
          required
          maxLength={200}
          defaultValue={v?.seller ?? purchase?.seller}
          className="h-11"
        />
      </Field>
      <Field
        id={`${prefix}-currency`}
        label="Currency"
        errors={fe.currency}
        hint={currencyLocked ? "Locked while the purchase has items." : "Every item in this purchase uses it."}
      >
        {currencyLocked ? <input type="hidden" name="currency" value={purchase?.currency} /> : null}
        <NativeSelect
          id={`${prefix}-currency`}
          name={currencyLocked ? undefined : "currency"}
          disabled={currencyLocked}
          defaultValue={v?.currency ?? purchase?.currency ?? "USD"}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id={`${prefix}-shipping`} label="Shipping" errors={fe.shipping} hint="Kept separate from the subtotal.">
        <Input
          id={`${prefix}-shipping`}
          name="shipping"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={
            v?.shipping ??
            (purchase ? toDecimalString({ amountMinor: purchase.shippingMinor, currency: purchase.currency }) : "")
          }
          className="h-11"
        />
      </Field>
      <Field id={`${prefix}-notes`} label="Notes" errors={fe.notes} className="sm:col-span-2">
        <Textarea id={`${prefix}-notes`} name="notes" maxLength={2000} defaultValue={v?.notes ?? purchase?.notes ?? ""} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending} className="h-11 px-4">
          {pending ? "Saving…" : purchase ? "Save purchase" : "Create purchase"}
        </Button>
        <FormMessage error={state.error} success={state.ok ? "Saved." : undefined} />
      </div>
    </form>
  );
}
