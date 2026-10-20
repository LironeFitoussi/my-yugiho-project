import { LogOutIcon } from "lucide-react";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getUsdIlsRate } from "@/features/pricing";
import { FxNote } from "@/features/pricing/components/fx-note";
import { requireOwner, signOut } from "@/lib/auth";

async function signOutAction() {
  "use server";
  await requireOwner();
  await signOut({ redirectTo: "/login" });
}

export default async function SettingsPage() {
  const owner = await requireOwner();
  const initials = (owner.name ?? owner.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="grid gap-6">
      <PageHeader title="Settings" description="Account and app settings." />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in with Google. Only this account can access the app.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              {owner.image ? <AvatarImage src={owner.image} alt="" /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{owner.name ?? "Owner"}</p>
              {owner.email ? <p className="truncate text-sm text-muted-foreground">{owner.email}</p> : null}
            </div>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" className="h-11 px-4">
              <LogOutIcon aria-hidden />
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currencies</CardTitle>
          <CardDescription>
            Amounts are stored in their original currency (USD or ILS) and never summed across currencies. Combined
            figures are converted with the latest exchange rate and show its date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-4 w-72" />}>
            <LatestRate />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data sources</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>
            Card data, images and market prices:{" "}
            <a
              href="https://ygoprodeck.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              YGOPRODeck
            </a>
            . Prices are estimates in USD; missing prices are shown as Price Unavailable.
          </p>
          <p>
            Exchange rates:{" "}
            <a
              href="https://frankfurter.dev/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              Frankfurter
            </a>{" "}
            (European Central Bank reference rates).
          </p>
          <p>Yu-Gi-Oh! is a trademark of Konami. This app is not affiliated with Konami or YGOPRODeck.</p>
        </CardContent>
      </Card>
    </div>
  );
}

async function LatestRate() {
  const rate = await getUsdIlsRate();
  return <FxNote rate={rate} className="text-sm" />;
}
