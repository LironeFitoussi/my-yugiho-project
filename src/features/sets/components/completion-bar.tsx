import { Progress } from "@/components/ui/progress";

import type { SetCompletion } from "../completion";

export function CompletionBar({ completion, size = "sm" }: { completion: SetCompletion; size?: "sm" | "lg" }) {
  const label = `${completion.owned} / ${completion.total} unique cards (${completion.percent}%)`;
  // PRD §9: completion counts card identities from any printing, not this set's original printings.
  const note = "Unique cards from any printing — not ownership of this set's original printings.";
  return (
    <div className="space-y-1.5">
      <p className={size === "lg" ? "text-base font-medium" : "text-xs text-muted-foreground"}>{label}</p>
      <Progress value={completion.percent} aria-label={`${label}. ${note}`} />
      {size === "sm" ? <p className="text-[11px] text-muted-foreground">Any printing counts</p> : null}
    </div>
  );
}
