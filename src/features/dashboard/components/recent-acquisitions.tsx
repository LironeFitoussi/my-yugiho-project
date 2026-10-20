import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listRecentAcquisitions } from "@/features/collection/queries";

export async function RecentAcquisitions() {
  const copies = await listRecentAcquisitions(8);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent acquisitions</CardTitle>
      </CardHeader>
      <CardContent>
        {copies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No copies added yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {copies.map((c) => (
              <li key={c.copyId}>
                <Link
                  href={`/cards/${c.cardId}`}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 hover:underline"
                >
                  <span className="min-w-0 truncate font-medium">{c.cardName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {[c.printingSetCode, c.condition, c.acquiredAt ?? c.createdAt.slice(0, 10)].filter(Boolean).join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
