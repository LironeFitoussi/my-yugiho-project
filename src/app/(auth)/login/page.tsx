import { redirect } from "next/navigation";
import { Suspense } from "react";

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
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Yu-Gi-Oh! Collection</CardTitle>
          <CardDescription>Private collection manager. Sign in with the authorized Google account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Suspense>
            <LoginError searchParams={searchParams} />
          </Suspense>
          <form action={signInWithGoogle}>
            <Button type="submit" size="lg" className="h-11 w-full">
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
