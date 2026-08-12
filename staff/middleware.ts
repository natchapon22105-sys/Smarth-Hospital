import { NextRequest, NextResponse } from "next/server";

// Must match backend/.env COOKIE_NAME.
const SESSION_COOKIE_NAME = "nudmedi_session";

/**
 * Gate for /nurse, /nurse/* and /admin.
 *
 * This only checks that the session cookie is PRESENT - it's a fast,
 * edge-friendly redirect for UX (no flash of protected UI, no round trip
 * for logged-out users). It is NOT the security boundary: every API route
 * that touches staff data independently validates the session server-side
 * via requireAuth/requireAdmin and re-derives the user from it (see
 * backend/src/middleware/auth.middleware.ts). A forged/stale cookie value
 * will pass this check but will be rejected with 401/403 by the API.
 *
 * Public routes (login/register) are excluded so staff can authenticate.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public staff auth pages — always reachable without a session.
  if (
    pathname === "/nurse/login" ||
    pathname === "/nurse/register" ||
    pathname === "/admin/login"
  ) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSession) {
    // Admins and nurses have separate login pages.
    const loginPath = pathname.startsWith("/admin") ? "/admin/login" : "/nurse/login";
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/nurse/:path*", "/admin/:path*"],
};
