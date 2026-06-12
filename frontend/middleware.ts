import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Prefix-matched public sections (a path and anything beneath it).
const PUBLIC_PREFIXES = ["/login", "/register", "/pricing", "/privacy", "/terms"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // NOTE: the previous implementation included "/" in this list and matched with
  // `startsWith`, which is true for *every* path — so auth was never enforced.
  // The root is matched exactly; everything else by section prefix.
  const isPublic =
    pathname === "/" ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPublic) {
    return NextResponse.next();
  }

  // Static assets and public files (images, fonts, etc.) — skip
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.[\w]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // The token check is client-side (localStorage) so middleware only redirects
  // based on a short-lived cookie that the auth store sets on login.
  const token = request.cookies.get("mp_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
