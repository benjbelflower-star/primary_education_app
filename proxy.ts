import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isResetPage = req.nextUrl.pathname === "/auth/reset-password";
  const isPasswordResetPage = req.nextUrl.pathname === "/auth/password-reset";

  const isPublicPage = isLoginPage || isResetPage || isPasswordResetPage;

  // Check for Supabase session cookie directly
  const cookies = req.cookies.getAll();
  const hasSession = cookies.some(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (!hasSession && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
  