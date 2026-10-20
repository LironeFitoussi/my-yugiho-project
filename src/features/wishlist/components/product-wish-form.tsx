"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, NativeSelect } from "@/features/products/components/fields";
import { PRODUCT_CATEGORIES, type Product, type WishlistItem } from "@/types";

import { createProductWishAction, updateProductWishAction } from "../actions";
import { initialWishlistActionState } from "../schemas";

type ProductWish = Extract<WishlistItem, { kind: "PRODUCT" }>;

/**
 * Create (no `wish`) or edit a product wish. "Fulfilled by" is an explicit choice among the
 * products the user recorded — a wish is never matched to a product automatically.
 */
export function ProductWishForm({
  wish,
  products,
}: {
  wish?: ProductWish;
  products: Pick<Product, "productId" | "name" | "category">[];
}) {
  const [state, formAction, pending] = useActionState(
    wish ? updateProductWishAction : createProductWishAction,
    initialWishlistActionState,
  );
  const fe = state.fieldErrors ?? {};
  const prefix = wish ? `wish-product-${wish.wishId}` : "wish-product-new";

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {wish ? <input type="hidden" name="wishId" value={wish.wishId} /> : null}
      <Field id={`${prefix}-name`} label="Product name" errors={fe.name} className="sm:col-span-2">
        <Input id={`${prefix}-name`} name="name" required maxLength={200} defaultValue={wish?.name} className="h-11" />
      </Field>
      <Field id={`${prefix}-category`} label="Category" errors={fe.category}>
        <NativeSelect id={`${prefix}-category`} name="category" defaultValue={wish?.category ?? PRODUCT_CATEGORIES[0]}>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id={`${prefix}-set`} label="Set code (optional)" errors={fe.setCode}>
        <Input
          id={`${prefix}-set`}
          name="setCode"
          maxLength={20}
          placeholder="e.g. LOB"
          autoCapitalize="characters"
          defaultValue={wish?.setCode ?? ""}
          className="h-11"
        />
      </Field>
      <Field
        id={`${prefix}-fulfilled`}
        label="Fulfilled by"
        errors={fe.fulfilledByProductId}
        hint="Pick the product you recorded once you own it. Never set automatically."
        className="sm:col-span-2"
      >
        <NativeSelect id={`${prefix}-fulfilled`} name="fulfilledByProductId" defaultValue={wish?.fulfilledByProductId ?? ""}>
          <option value="">Not owned yet</option>
          {products.map((p) => (
            <option key={p.productId} value={p.productId}>
              {p.name} ({p.category})
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id={`${prefix}-notes`} label="Notes" errors={fe.notes} className="sm:col-span-2">
        <Textarea id={`${prefix}-notes`} name="notes" maxLength={2000} defaultValue={wish?.notes ?? ""} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" className="h-11 px-4" disabled={pending}>
          {pending ? "Saving…" : wish ? "Save" : "Add product wish"}
        </Button>
        <FormMessage
          error={state.ok === false ? state.message : undefined}
          success={state.ok ? state.message : undefined}
        />
      </div>
    </form>
  );
}
