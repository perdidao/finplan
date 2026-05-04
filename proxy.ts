import { NextResponse, type NextRequest } from "next/server";
import { verifyCookieValue, AUTH_COOKIE_NAME } from "@/lib/auth/cookie";

export const config = {
  matcher: [
    // Run on everything except static assets, _next, and the login page itself.
    "/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)).*)",
  ],
};

export function proxy(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (verifyCookieValue(cookie)) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}
