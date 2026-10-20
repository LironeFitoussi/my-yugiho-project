"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireOwner } from "@/lib/auth";

import {
  addPurchaseItem,
  createPurchase,
  deletePurchase,
  getPurchaseHeader,
  PurchaseError,
  removePurchaseItem,
  updatePurchase,
} from "./repository";
import { addItemSchema, idSchema, type NewPurchaseItem, parseItemAmount, purchaseFormSchema } from "./schemas";

export type PurchaseActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted values, echoed back on failure so React's post-action form reset keeps them. */
  values?: Record<string, string>;
  /** Fresh idempotency token for the next submit of the same form. */
  nextToken?: string;
};

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
};

function readHeader(formData: FormData) {
  return {
    date: str(formData, "date"),
    seller: str(formData, "seller"),
    currency: str(formData, "currency"),
    shipping: str(formData, "shipping"),
    notes: str(formData, "notes"),
  };
}

/** Client-generated idempotency token (one per form instance); falls back to a fresh one. */
function requestToken(formData: FormData): string {
  const parsed = idSchema.safeParse(formData.get("requestToken"));
  return parsed.success ? parsed.data : crypto.randomUUID();
}

function failure(err: unknown): PurchaseActionState {
  if (err instanceof PurchaseError) return { error: err.message };
  console.error("purchase action failed", err);
  return { error: "Something went wrong. Please try again." };
}

function revalidatePurchases(purchaseId?: string) {
  revalidatePath("/purchases");
  if (purchaseId) revalidatePath(`/purchases/${purchaseId}`);
  revalidatePath("/products");
  revalidatePath("/collection");
  revalidatePath("/");
}

export async function createPurchaseAction(_prev: PurchaseActionState, formData: FormData): Promise<PurchaseActionState> {
  await requireOwner();
  const values = readHeader(formData);
  const parsed = purchaseFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  let purchaseId: string;
  try {
    purchaseId = (await createPurchase(parsed.data)).purchaseId;
  } catch (err) {
    return { ...failure(err), values };
  }
  revalidatePurchases();
  redirect(`/purchases/${purchaseId}`);
}

export async function updatePurchaseAction(_prev: PurchaseActionState, formData: FormData): Promise<PurchaseActionState> {
  await requireOwner();
  const id = idSchema.safeParse(formData.get("purchaseId"));
  if (!id.success) return { error: "Invalid purchase." };
  const values = readHeader(formData);
  const parsed = purchaseFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  try {
    await updatePurchase(id.data, parsed.data);
  } catch (err) {
    return { ...failure(err), values };
  }
  revalidatePurchases(id.data);
  return { ok: true };
}

export async function deletePurchaseAction(_prev: PurchaseActionState, formData: FormData): Promise<PurchaseActionState> {
  await requireOwner();
  const id = idSchema.safeParse(formData.get("purchaseId"));
  if (!id.success) return { error: "Invalid purchase." };
  try {
    await deletePurchase(id.data);
  } catch (err) {
    return failure(err);
  }
  revalidatePurchases(id.data);
  redirect("/purchases");
}

export async function addPurchaseItemAction(_prev: PurchaseActionState, formData: FormData): Promise<PurchaseActionState> {
  await requireOwner();
  const result = await addItem(formData);
  return { ...result, nextToken: crypto.randomUUID() };
}

async function addItem(formData: FormData): Promise<PurchaseActionState> {
  const id = idSchema.safeParse(formData.get("purchaseId"));
  if (!id.success) return { error: "Invalid purchase." };
  const values = {
    kind: str(formData, "kind"),
    ref: str(formData, "ref"),
    productId: str(formData, "productId"),
    description: str(formData, "description"),
    amount: str(formData, "amount"),
  };
  const parsed = addItemSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  try {
    const header = await getPurchaseHeader(id.data);
    if (!header) return { error: "This purchase no longer exists." };
    const amountMinor = parseItemAmount(parsed.data.amount, header.currency);
    if (amountMinor === null) {
      return { fieldErrors: { amount: [`Enter a valid ${header.currency} amount, e.g. 12.50`] }, values };
    }
    const token = requestToken(formData);
    const input = parsed.data;
    const item: NewPurchaseItem =
      input.kind === "COPY"
        ? { kind: "COPY", cardId: input.ref.cardId, copyId: input.ref.copyId, amountMinor }
        : input.kind === "PRODUCT"
          ? { kind: "PRODUCT", productId: input.productId, amountMinor }
          : // the token doubles as the misc item id, so a double submit can't add the line twice
            { kind: "MISC", itemId: token, description: input.description, amountMinor };
    await addPurchaseItem(id.data, item, token);
  } catch (err) {
    return { ...failure(err), values };
  }
  revalidatePurchases(id.data);
  return { ok: true };
}

const removeItemSchema = z.object({
  purchaseId: idSchema,
  kind: z.enum(["COPY", "PRODUCT", "MISC"]),
  refId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
});

export async function removePurchaseItemAction(
  _prev: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  await requireOwner();
  const parsed = removeItemSchema.safeParse({
    purchaseId: formData.get("purchaseId"),
    kind: formData.get("kind"),
    refId: formData.get("refId"),
  });
  if (!parsed.success) return { error: "Invalid item." };
  try {
    await removePurchaseItem(parsed.data.purchaseId, parsed.data.kind, parsed.data.refId, requestToken(formData));
  } catch (err) {
    return failure(err);
  }
  revalidatePurchases(parsed.data.purchaseId);
  return { ok: true };
}
