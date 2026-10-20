"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { deleteProductAction, type ProductActionState } from "../actions";
import { FormMessage } from "./fields";

const initialState: ProductActionState = {};

export function DeleteProductButton({ productId, disabled }: { productId: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(deleteProductAction, initialState);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Delete this product? This cannot be undone.")) e.preventDefault();
      }}
      className="grid gap-1"
    >
      <input type="hidden" name="productId" value={productId} />
      <Button type="submit" variant="destructive" disabled={pending || disabled} className="h-11 px-4">
        {pending ? "Deleting…" : "Delete product"}
      </Button>
      <FormMessage error={state.error} />
    </form>
  );
}
