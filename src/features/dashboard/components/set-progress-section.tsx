import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompletionBar } from "@/features/sets/components/completion-bar";

import { getDashboardSetProgress } from "../queries";

export async function SetProgressSection() {
  const progress = await getDashboardSetProgress();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set completion</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!progress.ok ? (
          <p className="text-sm text-muted-foreground">Set data is unavailable right now.</p>
        ) : progress.sets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classic sets found.</p>
        ) : (
          <ul className="grid gap-3">
            {progress.sets.map(({ set, completion }) => (
              <li key={set.code}>
                <Link href={`/sets/${set.code}`} className="grid min-h-11 gap-1 rounded-lg p-1 hover:bg-muted">
                  <span className="text-sm font-medium">
                    {set.name} <span className="text-xs text-muted-foreground">({set.code})</span>
                  </span>
                  <CompletionBar completion={completion} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/sets" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
          All sets
        </Link>
      </CardContent>
    </Card>
  );
}
