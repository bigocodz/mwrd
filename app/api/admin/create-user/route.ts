import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const cookieStore = await cookies()

  // Session client — verify the calling user is ADMIN
  const sessionClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    },
  )

  const { data: { user: caller } } = await sessionClient.auth.getUser()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await sessionClient
    .from('profiles')
    .select('role')
    .eq('user_id', caller.id)
    .single()

  if (callerProfile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, role, company_name } = body as {
    email: string
    password: string
    role: string
    company_name?: string
  }

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'email, password, and role are required' }, { status: 400 })
  }

  // Service client — admin operations
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Pre-register the role so the auth trigger picks it up
  const { error: pendingError } = await admin.from('pending_users').upsert(
    { email, role, company_name: company_name ?? '' },
    { onConflict: 'email' },
  )
  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 500 })
  }

  // Create the auth user (email already confirmed; must change password on first login)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  })
  if (createError) {
    // Roll back pending_users row if user creation failed
    await admin.from('pending_users').delete().eq('email', email)
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  // Mark must_change_password on the profile (trigger may have already run)
  if (created.user) {
    await admin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('user_id', created.user.id)
  }

  return NextResponse.json({ success: true, user_id: created.user?.id })
}
