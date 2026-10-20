"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { requireOwner } from "@/lib/auth";
import { getCard } from "@/lib/ygoprodeck";

import { createCopy, deleteCopy, getCopy, updateCopy } from "./repository";
import {
  cardIdSchema,
  copyFormSchema,
  copyRefSchema,
  type AllowedPrinting,
  type CopyActionState,
} from "./schemas";

const formFields = (formData: FormData) => ({
  printing: formData.get("printing") ?? undefined,
  condition: formData.get("condition"),
  price: formData.get("price") ?? undefined,
  currency: formData.get("currency") ?? undefined,
  acquiredAt: formData.get("acquiredAt") ?? undefined,
  notes: formData.get("notes") ?? undefined,
});

function invalid(error: z.ZodError): CopyActionState {
  const fieldErrors: NonNullable<CopyActionState["fieldErrors"]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as keyof typeof fieldErrors] = issue.message;
    }
  }
  return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
}

function revalidate(cardId: number) {
  revalidatePath("/collection");
  revalidatePath(`/cards/${cardId}`);
  revalidatePath("/");
}

/** Adds one physical copy. The card's name and printings come from the catalog, never the client. */
export async function createCopyAction(_prev: CopyActionState, formData: FormData): Promise<CopyActionState> {
  await requireOwner();
  const cardId = cardIdSchema.safeParse(formData.get("cardId"));
  if (!cardId.success) return { ok: false, message: "Unknown card." };

  const card = await getCard(cardId.data);
  if (!card.ok) {
    return {
      ok: false,
      message:
        card.error === "not_found"
          ? "That card was not found in the catalog."
          : "The card catalog is unavailable right now — please try again shortly.",
    };
  }

  const parsed = copyFormSchema(card.data.printings).safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);

  await createCopy({ id: card.data.id, name: card.data.name }, parsed.data);
  revalidate(card.data.id);
  return { ok: true, message: "Copy added." };
}

/**
 * Edits one copy's own fields. Keeping the current printing never needs the catalog, so edits
 * still work when the catalog is down; choosing a different printing is checked against it.
 */
export async function updateCopyAction(_prev: CopyActionState, formData: FormData): Promise<CopyActionState> {
  await requireOwner();
  const ref = copyRefSchema.safeParse({ cardId: formData.get("cardId"), copyId: formData.get("copyId") });
  if (!ref.success) return { ok: false, message: "Unknown copy." };

  const existing = await getCopy(ref.data.cardId, ref.data.copyId);
  if (!existing) return { ok: false, message: "This copy no longer exists." };

  const allowed: AllowedPrinting[] = [];
  if (existing.printingSetCode && existing.printingRarity !== null) {
    allowed.push({ setCode: existing.printingSetCode, rarity: existing.printingRarity });
  }
  const fields = formFields(formData);
  let parsed = copyFormSchema(allowed).safeParse(fields);
  if (!parsed.success && parsed.error.issues.some((i) => i.path[0] === "printing")) {
    const card = await getCard(existing.cardId);
    if (!card.ok) {
      return { ok: false, message: "The card catalog is unavailable, so the printing can't be changed right now." };
    }
    parsed = copyFormSchema(card.data.printings).safeParse(fields);
  }
  if (!parsed.success) return invalid(parsed.error);

  const result = await updateCopy(existing, parsed.data);
  if (!result.ok) return { ok: false, message: "This copy no longer exists." };
  revalidate(existing.cardId);
  return { ok: true, message: "Copy updated." };
}

export async function deleteCopyAction(_prev: CopyActionState, formData: FormData): Promise<CopyActionState> {
  await requireOwner();
  const ref = copyRefSchema.safeParse({ cardId: formData.get("cardId"), copyId: formData.get("copyId") });
  if (!ref.success) return { ok: false, message: "Unknown copy." };

  const result = await deleteCopy(ref.data.cardId, ref.data.copyId);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.error === "linked_to_purchase"
          ? "Unlink this copy from its purchase first."
          : "This copy no longer exists.",
    };
  }
  revalidate(ref.data.cardId);
  return { ok: true, message: "Copy deleted." };
}
