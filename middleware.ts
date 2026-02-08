// Next.js Middleware - Route Protection
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get user role from cookie (set by auth-context)
  const userRole = request.cookies.get("userRole")?.value;

  // Public routes - no authentication required
  const publicRoutes = [
    "/",
    "/login",
    "/test",
    "/test-login",
    "/debug",
    "/check-setup",
  ];
  if (
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    )
  ) {
    // If already logged in, redirect to dashboard (except test pages)
    if (userRole && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // All other routes require authentication
  if (!userRole) {
    // Not logged in - redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  const adminOnlyRoutes = ["/cash", "/inventory", "/users"];
  const isAdminRoute = adminOnlyRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isAdminRoute && userRole !== "admin") {
    // Staff trying to access admin route - redirect to dashboard with error
    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(dashboardUrl);
  }

  // Routes accessible by all authenticated users (admin and staff)
  const authenticatedRoutes = [
    "/dashboard",
    "/sales",
    "/expenses",
    "/settings",
    "/reports",
  ];
  const isAuthenticatedRoute = authenticatedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isAuthenticatedRoute && (userRole === "admin" || userRole === "staff")) {
    return NextResponse.next();
  }

  // For admin routes, allow access
  if (isAdminRoute && userRole === "admin") {
    return NextResponse.next();
  }

  // Unknown route - redirect to dashboard
  return NextResponse.redirect(new URL("/dashboard", request.url));
}

// Apply middleware to all routes except static files, API routes, and Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
