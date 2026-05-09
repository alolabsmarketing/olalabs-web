import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/practice", "/profile", "/characters"];
const AUTH_ONLY = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const token = req.cookies.get("sb-access-token")?.value;
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some((r) => pathname.startsWith(r));
  const isAuthOnly = AUTH_ONLY.some((r) => pathname.startsWith(r));

  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthOnly && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
