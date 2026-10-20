"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormMessage, NativeSelect } from "@/features/products/components/fields";
import type { Currency } from "@/lib/money";

import { addPurchaseItemAction, type PurchaseActionState } from "../actions";

export type ItemOption = { value: string; label: string };

type Kind = "COPY" | "PRODUCT" | "MISC";

/**
 * Adds a line to a purchase: an unlinked card copy, an unlinked product, or a misc line
 * (e.g. "Lot of commons", fees). Linking never creates copies — copies are added from the card page.
 */
export function AddItemForm({
  purchaseId,
  currency,
  copyOptions,
  productOptions,
  initialToken,
}: {
  purchaseId: string;
  currency: Currency;
  copyOptions: ItemOption[];
  productOptions: ItemOption[];
  initialToken: string;
}) {
  const [state, formAction, pending] = useActionState(addPurchaseItemAction, {} as PurchaseActionState);
  const [kind, setKind] = useState<Kind>((state.values?.kind as Kind | undefined) ?? "COPY");
  const fe = state.fieldErrors ?? {};
  const v = state.values;
  const id = `add-item-${purchaseId}`;

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <input type="hidden" name="requestToken" value={state.nextToken ?? initialToken} />
      <Field id={`${id}-kind`} label="Item type" errors={fe.kind}>
        <NativeSelect
          id={`${id}-kind`}
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
        >
          <option value="COPY">Card copy from my collection</option>
          <option value="PRODUCT">Product</option>
          <option value="MISC">Other line (lot, fee, …)</option>
        </NativeSelect>
      </Field>

      {kind === "COPY" ? (
        <Field
          id={`${id}-copy`}
          label="Copy"
          errors={fe.ref}
          hint={copyOptions.length === 0 ? "No unlinked copies. Add copies from a card page first." : undefined}
        >
          <NativeSelect id={`${id}-copy`} name="ref" required defaultValue={v?.ref ?? ""}>
            <option value="" disabled>
              Choose a copy…
            </option>
            {copyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}

      {kind === "PRODUCT" ? (
        <Field
          id={`${id}-product`}
          label="Product"
          errors={fe.productId}
          hint={productOptions.length === 0 ? "No unlinked products. Record one on the Products page." : undefined}
        >
          <NativeSelect id={`${id}-product`} name="productId" required defaultValue={v?.productId ?? ""}>
            <option value="" disabled>
              Choose a product…
            </option>
            {productOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}

      {kind === "MISC" ? (
        <Field id={`${id}-description`} label="Description" errors={fe.description}>
          <Input
            id={`${id}-description`}
            name="description"
            required
            maxLength={200}
            defaultValue={v?.description ?? ""}
            className="h-11"
          />
        </Field>
      ) : null}

      <Field id={`${id}-amount`} label={`Amount (${currency})`} errors={fe.amount}>
        <Input
          id={`${id}-amount`}
          name="amount"
          inputMode="decimal"
          placeholder="0.00"
          required
          defaultValue={v?.amount ?? ""}
          className="h-11"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending} className="h-11 px-4">
          {pending ? "Adding…" : "Add to purchase"}
        </Button>
        <FormMessage error={state.error} success={state.ok ? "Item added." : undefined} />
      </div>
    </form>
  );
}
