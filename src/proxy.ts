import { NextResponse, type NextRequest } from "next/server";

// Optimistic redirect only: real authorization happens server-side in every
// page, server action and route handler via `requireOwner()` (src/lib/auth).
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) =>
    request.cookies.getAll().some((c) => c.name === name || c.name.startsWith(`${name}.`)),
  );
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Public assets the login screen and PWA install need before sign-in (tab icon, brand logo, icons).
    "/((?!login|api/auth|api/health|_next/static|_next/image|favicon.ico|icon.png|manifest.webmanifest|sw.js|icons/|brand/|apple-touch-icon).*)",
  ],
};
