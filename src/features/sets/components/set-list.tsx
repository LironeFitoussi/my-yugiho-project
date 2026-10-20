import type { Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import type { SetListEntry } from "../queries";
import { CompletionBar } from "./completion-bar";

export function SetList({ entries }: { entries: SetListEntry[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(({ set, completion }) => (
        <li key={set.code}>
          <Link
            href={`/sets/${encodeURIComponent(set.code)}` as Route}
            className="flex min-h-11 flex-col gap-2 rounded-xl p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 font-medium">{set.name}</span>
              {set.isClassic ? (
                <Badge variant="secondary" className="shrink-0">
                  Classic
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{set.code}</span> · {set.cardCount} cards
              {set.releaseDate ? ` · ${set.releaseDate}` : ""}
            </p>
            {completion ? <CompletionBar completion={completion} /> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
