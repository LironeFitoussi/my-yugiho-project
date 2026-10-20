import type { ComponentProps, ReactNode } from "react";

import { cn } from "cn";

import { Label } from "@/components/ui/label";

/** Native select styled like the shadcn input — best behaviour on iPhone, submits with the form. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  id,
  label,
  errors,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  errors?: string[];
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {errors?.length ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {success}
      </p>
    );
  }
  return null;
}
