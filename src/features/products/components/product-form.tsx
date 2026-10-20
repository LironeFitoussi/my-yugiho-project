"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES, toDecimalString } from "@/lib/money";
import { PRODUCT_CATEGORIES, type Product } from "@/types";

import { createProductAction, type ProductActionState, updateProductAction } from "../actions";
import { Field, FormMessage, NativeSelect } from "./fields";

const initialState: ProductActionState = {};

/** Create (no `product`) or edit a product. Records the product only — never its cards. */
export function ProductForm({ product, defaultDate }: { product?: Product; defaultDate?: string }) {
  const [state, formAction, pending] = useActionState(
    product ? updateProductAction : createProductAction,
    initialState,
  );
  const prefix = product ? `product-${product.productId}` : "product-new";
  const fe = state.fieldErrors ?? {};
  const v = state.values;
  const currency = v?.currency ?? product?.price?.currency ?? product?.shipping?.currency ?? "USD";

  return (
    <form
      action={formAction}
      className="grid gap-4 sm:grid-cols-2"
    >
      {product ? <input type="hidden" name="productId" value={product.productId} /> : null}
      <Field id={`${prefix}-name`} label="Product name" errors={fe.name} className="sm:col-span-2">
        <Input
          id={`${prefix}-name`}
          name="name"
          required
          maxLength={200}
          defaultValue={v?.name ?? product?.name}
          className="h-11"
        />
      </Field>
      <Field id={`${prefix}-category`} label="Category" errors={fe.category}>
        <NativeSelect id={`${prefix}-category`} name="category" defaultValue={v?.category ?? product?.category ?? PRODUCT_CATEGORIES[0]}>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id={`${prefix}-status`} label="Status" errors={fe.status}>
        <NativeSelect id={`${prefix}-status`} name="status" defaultValue={v?.status ?? product?.status ?? "sealed"}>
          <option value="sealed">Sealed</option>
          <option value="opened">Opened</option>
        </NativeSelect>
      </Field>
      <Field id={`${prefix}-date`} label="Purchase date" errors={fe.purchaseDate}>
        <Input
          id={`${prefix}-date`}
          name="purchaseDate"
          type="date"
          defaultValue={v?.purchaseDate ?? (product ? (product.purchaseDate ?? "") : defaultDate)}
          className="h-11"
        />
      </Field>
      <Field id={`${prefix}-seller`} label="Seller" errors={fe.seller}>
        <Input
          id={`${prefix}-seller`}
          name="seller"
          maxLength={200}
          defaultValue={v?.seller ?? product?.seller ?? ""}
          className="h-11"
        />
      </Field>
      <Field id={`${prefix}-currency`} label="Currency" errors={fe.currency}>
        <NativeSelect id={`${prefix}-currency`} name="currency" defaultValue={currency}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id={`${prefix}-price`} label="Price" errors={fe.price}>
        <Input
          id={`${prefix}-price`}
          name="price"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={v?.price ?? (product?.price ? toDecimalString(product.price) : "")}
          className="h-11"
        />
      </Field>
      <Field id={`${prefix}-shipping`} label="Shipping" errors={fe.shipping} hint="Kept separate from the price.">
        <Input
          id={`${prefix}-shipping`}
          name="shipping"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={v?.shipping ?? (product?.shipping ? toDecimalString(product.shipping) : "")}
          className="h-11"
        />
      </Field>
      <Field id={`${prefix}-notes`} label="Notes" errors={fe.notes} className="sm:col-span-2">
        <Textarea id={`${prefix}-notes`} name="notes" maxLength={2000} defaultValue={v?.notes ?? product?.notes ?? ""} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending} className="h-11 px-4">
          {pending ? "Saving…" : product ? "Save product" : "Add product"}
        </Button>
        <FormMessage error={state.error} success={state.ok ? "Saved." : undefined} />
      </div>
    </form>
  );
}
