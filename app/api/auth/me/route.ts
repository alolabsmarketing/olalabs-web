import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("sb-access-token")?.value;
  return NextResponse.json({ loggedIn: !!token });
}
