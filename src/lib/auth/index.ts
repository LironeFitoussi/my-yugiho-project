import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { auth, isAuthorizedSub } from "./config";

export { signIn, signOut, handlers } from "./config";

export type Owner = { sub: string; name: string | null; email: string | null; image: string | null };

/** Returns the authorized owner, or null. Re-checks the `sub` on every call — never trust the cookie alone. */
export const getOwner = cache(async (): Promise<Owner | null> => {
  // Auth.js uses crypto before touching request data; opt out of prerendering first (Cache Components).
  await connection();
  const session = await auth();
  const sub = session?.user?.id;
  if (!isAuthorizedSub(sub)) return null;
  return {
    sub: sub as string,
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  };
});

/**
 * Server-side gate for pages and server actions (PRD §6).
 * Call at the top of every page, layout-independent component that reads data, and every server action.
 */
export async function requireOwner(): Promise<Owner> {
  const owner = await getOwner();
  if (!owner) redirect("/login");
  return owner;
}

/** Route-handler variant: returns a 401 Response instead of redirecting. */
export async function ownerOrUnauthorized(): Promise<Owner | Response> {
  const owner = await getOwner();
  return owner ?? new Response(null, { status: 401 });
}
