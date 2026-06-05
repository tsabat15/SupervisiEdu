import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/laporan', '/jadwal', '/profil']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

  // 1. Unauthenticated on a protected route → login
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Authenticated on /login → route based on verification status
  if (pathname === '/login' && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_verified')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_verified) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/verify-profile', request.url))
  }

  // 3. Authenticated + already verified → block /verify-profile access
  if (pathname === '/verify-profile' && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_verified')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_verified) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
}