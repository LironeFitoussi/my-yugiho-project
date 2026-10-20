import "server-only";

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { serverEnv } from "@/lib/env";

/** True only for the single authorized Google account (PRD §6). */
export function isAuthorizedSub(sub: unknown): boolean {
  const expected = serverEnv().AUTHORIZED_GOOGLE_SUB;
  return typeof sub === "string" && sub.length > 0 && sub === expected;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Reject every Google account except the authorized subject.
    signIn({ account, profile }) {
      return account?.provider === "google" && isAuthorizedSub(profile?.sub);
    },
    jwt({ token, profile }) {
      if (profile?.sub) token.sub = profile.sub;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
