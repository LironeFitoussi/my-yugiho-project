"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES, toDecimalString } from "@/lib/money";
import { CONDITIONS, type CardCopy } from "@/types";

import { createCopyAction, updateCopyAction } from "../actions";
import { initialCopyActionState, printingKey, type CopyActionState } from "../schemas";

export type PrintingOption = { setCode: string; rarity: string; setName: string };

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

type Props = {
  cardId: number;
  cardName: string;
  printings: PrintingOption[];
  /** Present when editing an existing copy. */
  copy?: CardCopy;
};

export function CopyFormDialog({ cardId, cardName, printings, copy }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={copy ? "outline" : "default"}
            className="h-11 min-w-11 px-3"
            aria-label={copy ? `Edit this copy of ${cardName}` : undefined}
          />
        }
      >
        {copy ? <PencilIcon /> : <PlusIcon />}
        {copy ? <span className="sr-only sm:not-sr-only">Edit</span> : "Add copy"}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy ? "Edit copy" : "Add a copy"}</DialogTitle>
          <DialogDescription>
            {copy
              ? `Changes apply only to this one physical copy of ${cardName}.`
              : `Each physical copy of ${cardName} is its own record with its own condition, price and date.`}
          </DialogDescription>
        </DialogHeader>
        <CopyForm cardId={cardId} printings={printings} copy={copy} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CopyForm({
  cardId,
  printings,
  copy,
  onDone,
}: Pick<Props, "cardId" | "printings" | "copy"> & { onDone: () => void }) {
  const action = copy ? updateCopyAction : createCopyAction;
  const [state, formAction, pending] = useActionState(
    async (prev: CopyActionState, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        onDone();
      }
      return result;
    },
    initialCopyActionState,
  );
  const errors = state.fieldErrors ?? {};
  const currentPrinting =
    copy?.printingSetCode && copy.printingRarity !== null
      ? printingKey({ setCode: copy.printingSetCode, rarity: copy.printingRarity })
      : "";
  // Keep the copy's current printing selectable even if the option list doesn't include it.
  const options = [...printings];
  if (copy?.printingSetCode && !options.some((p) => printingKey(p) === currentPrinting)) {
    options.unshift({ setCode: copy.printingSetCode, rarity: copy.printingRarity ?? "", setName: "" });
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="cardId" value={cardId} />
      {copy ? <input type="hidden" name="copyId" value={copy.copyId} /> : null}

      <Field label="Printing (optional)" htmlFor="printing" error={errors.printing}>
        <select
          id="printing"
          name="printing"
          defaultValue={currentPrinting}
          className={selectClass}
          aria-invalid={!!errors.printing}
        >
          <option value="">Not recorded</option>
          {options.map((p) => (
            <option key={printingKey(p)} value={printingKey(p)}>
              {[p.setCode, p.rarity, p.setName].filter(Boolean).join(" · ")}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Condition" htmlFor="condition" error={errors.condition}>
        <select
          id="condition"
          name="condition"
          defaultValue={copy?.condition ?? "Near Mint"}
          className={selectClass}
          aria-invalid={!!errors.condition}
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="Purchase price (optional)" htmlFor="price" error={errors.price}>
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            placeholder="12.50"
            autoComplete="off"
            defaultValue={copy?.purchasePrice ? toDecimalString(copy.purchasePrice) : ""}
            className="h-11"
            aria-invalid={!!errors.price}
          />
        </Field>
        <Field label="Currency" htmlFor="currency" error={errors.currency}>
          <select
            id="currency"
            name="currency"
            defaultValue={copy?.purchasePrice?.currency ?? "USD"}
            className={selectClass}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Acquired on (optional)" htmlFor="acquiredAt" error={errors.acquiredAt}>
        <Input
          id="acquiredAt"
          name="acquiredAt"
          type="date"
          defaultValue={copy?.acquiredAt ?? ""}
          className="h-11"
          aria-invalid={!!errors.acquiredAt}
        />
      </Field>

      <Field label="Notes (optional)" htmlFor="notes" error={errors.notes}>
        <Textarea id="notes" name="notes" maxLength={1000} defaultValue={copy?.notes ?? ""} aria-invalid={!!errors.notes} />
      </Field>

      {state.message && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="submit" disabled={pending} className="h-11 px-4">
          {pending ? "Saving…" : copy ? "Save changes" : "Add copy"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
