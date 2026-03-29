import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PUBLIC_ROUTES, ADMIN_ROUTES } from '@/lib/constants'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Always call getUser() to refresh session – never skip this.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ─── Public / Private route check ───────────────────────────────────────────
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ─── Admin route check ────────────────────────────────────────────────────
  // Read role from JWT app_metadata (set by DB trigger) for zero-latency check.
  // Falls back to a DB query when the claim is absent (e.g. before trigger runs).
  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (user && isAdminRoute) {
    // Try JWT claim first (fastest path)
    const jwtRole =
      (user.app_metadata?.role as string | undefined) ||
      (user.user_metadata?.role as string | undefined)

    let role = jwtRole

    if (!role) {
      // Fallback: single DB query (happens only when JWT claim is not set yet)
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      role = data?.role
    }

    if (role !== 'admin') {
      const url = new URL('/dashboard', request.url)
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - any file with an extension (e.g. .png, .svg)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
