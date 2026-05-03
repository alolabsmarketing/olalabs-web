import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("sb-access-token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // /practice removed — handled via client-side demo mode
  matcher: ["/dashboard/:path*", "/profile/:path*", "/characters/:path*"],
};
