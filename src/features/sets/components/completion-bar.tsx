import { Progress } from "@/components/ui/progress";

import type { SetCompletion } from "../completion";

export function CompletionBar({ completion, size = "sm" }: { completion: SetCompletion; size?: "sm" | "lg" }) {
  const label = `${completion.owned} / ${completion.total} unique cards (${completion.percent}%)`;
  return (
    <div className="space-y-1.5">
      <p className={size === "lg" ? "text-base font-medium" : "text-xs text-muted-foreground"}>{label}</p>
      <Progress value={completion.percent} aria-label={label} />
    </div>
  );
}
