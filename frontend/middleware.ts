import { NextRequest, NextResponse } from "next/server";

// Must match backend/.env COOKIE_NAME.
const SESSION_COOKIE_NAME = "nudmedi_session";

/**
 * Gate for /app-home, /booking, /patient/*.
 *
 * This only checks that the session cookie is PRESENT - it's a fast,
 * edge-friendly redirect for UX (no flash of protected UI, no round trip
 * for logged-out users). It is NOT the security boundary: every API route
 * that touches patient data independently validates the session server-side
 * via requireAuth and re-derives patientId from it (see backend/src/
 * middleware/auth.middleware.ts). A forged/stale cookie value will pass this
 * check but will be rejected with 401 by the API.
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app-home/:path*", "/booking/:path*", "/patient/:path*", "/admin/:path*"],
};
