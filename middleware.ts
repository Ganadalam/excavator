import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register"];
const EMERGENCY_PATHS = ["/emergency", "/api/emergency"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  // Emergency page: allow through — it does its own JWT verification without DB
  if (EMERGENCY_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();

  const token = req.cookies.get("exmgmt_token")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  const payload = await verifySessionToken(token);
  if (!payload) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("exmgmt_token", "", { maxAge: 0, path: "/" });
    return res;
  }

  // Admin-only routes
  if (pathname.startsWith("/dashboard/admin") || pathname.startsWith("/api/admin")) {
    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard/work", req.url));
    }
  }

  const res = NextResponse.next();
  res.headers.set("x-user-id",   payload.sub);
  res.headers.set("x-user-role", payload.role ?? "user");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
