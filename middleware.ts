import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase session middleware.
 *
 * - Refreshes the auth session on every request (required for SSR).
 * - Enforces role-based access control for the three portals:
 *   /admin  → ADMIN or AUDITOR only
 *   /client → CLIENT only
 *   /supplier → SUPPLIER only
 * - Unauthenticated users are redirected to /login.
 * - Wrong-role users are redirected to /unauthorized.
 */
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
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session (important — do not remove)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes — no auth required
  const publicRoutes = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/change-password',
    '/get-started',
    '/account-status',
    '/unauthorized',
    '/api',          // public API routes
    '/_next',
    '/favicon.ico',
  ]
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r))

  if (isPublic) return supabaseResponse

  // Not logged in → redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Load the profile to get role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, must_change_password')
    .eq('user_id', user.id)
    .single()

  // No profile yet (shouldn't happen if trigger fires) → login
  if (!profile) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Force password change on first login
  if (profile.must_change_password) {
    const url = request.nextUrl.clone()
    url.pathname = '/change-password'
    return NextResponse.redirect(url)
  }

  // Non-active accounts go to account-status
  if (profile.status !== 'ACTIVE') {
    const url = request.nextUrl.clone()
    url.pathname = '/account-status'
    return NextResponse.redirect(url)
  }

  const role = profile.role

  // Portal-level access control
  if (pathname.startsWith('/admin')) {
    if (role !== 'ADMIN' && role !== 'AUDITOR') {
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/client')) {
    if (role !== 'CLIENT') {
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/supplier')) {
    if (role !== 'SUPPLIER') {
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }
  }

  // Root redirect — send logged-in users to their portal
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname =
      role === 'ADMIN' || role === 'AUDITOR'
        ? '/admin/dashboard'
        : role === 'CLIENT'
          ? '/client/dashboard'
          : '/supplier/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Match everything except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
