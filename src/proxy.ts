import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/token";
import { SESSION_COOKIE, getSessionSecret } from "@/lib/auth/config";

// In Next 16 the `middleware` convention was renamed to `proxy` (Node.js runtime).
// This is an OPTIMISTIC gate: it redirects based on the signed cookie only. The
// authoritative checks still live at the data source — the board page calls
// requireSession() and /api/triage rejects unauthenticated POSTs.

const PUBLIC_PATHS = ["/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = verifyToken(token, getSessionSecret());

  // Signed in but sitting on /login → send to the board.
  if (session && isPublic(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Not signed in and asking for a protected page → gate to /login.
  if (!session && !isPublic(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on pages only. API routes guard themselves; static assets need no gate.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
