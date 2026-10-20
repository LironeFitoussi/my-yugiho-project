import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ArcaneBackdrop } from "@/components/layout/arcane-backdrop";
import { Emblem } from "@/components/shared/emblem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOwner, signIn } from "@/lib/auth";

export const metadata = { title: "Sign in" };

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/" });
}

async function LoginError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  if (await getOwner()) redirect("/");
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error === "AccessDenied" ? "This Google account is not authorized." : "Sign-in failed. Please try again."}
    </p>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <ArcaneBackdrop />
      <Card className="frame-gold w-full max-w-sm animate-in fade-in zoom-in-95 shadow-[0_0_60px_-12px] shadow-gold/40 ring-0 duration-500">
        <CardHeader className="justify-items-center text-center">
          <div className="relative mb-2 grid place-items-center">
            <div
              aria-hidden
              className="absolute size-24 animate-glow-pulse rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.14_85/0.35),oklch(0.55_0.2_300/0.2)_60%,transparent)]"
            />
            <Emblem className="relative size-16 drop-shadow-[0_0_10px_oklch(0.82_0.14_85/0.6)]" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-wide text-gold-gradient">Yu-Gi-Oh! Collection</CardTitle>
          <CardDescription>Private collection manager. Sign in with the authorized Google account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Suspense>
            <LoginError searchParams={searchParams} />
          </Suspense>
          <form action={signInWithGoogle}>
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full bg-linear-to-b from-gold to-gold-deep font-semibold shadow-[0_0_20px_-4px] shadow-gold/60 hover:brightness-110"
            >
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
