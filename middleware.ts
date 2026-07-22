import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  if (isAdminRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  // Fine-grained role check (admin vs staff vs customer) happens in the
  // route/layout itself via requireRole() — middleware only gates "logged in
  // at all" here, since role lookup needs a DB round trip best done once,
  // close to where the data is actually used (see src/app/(admin)/admin/layout.tsx).

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets, so auth cookies stay fresh
     * app-wide, while excluding _next/static, _next/image, and common
     * public files to avoid burning middleware invocations needlessly.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
