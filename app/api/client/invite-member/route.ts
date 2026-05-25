import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const cookieStore = await cookies()

  // Session client — verify the calling user is a CLIENT with OWNER or ADMIN team role
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
    .select('id, role, team_role, parent_client_id')
    .eq('user_id', caller.id)
    .single()

  if (callerProfile?.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (callerProfile.team_role && !['OWNER', 'ADMIN'].includes(callerProfile.team_role)) {
    return NextResponse.json({ error: 'Only team owners and admins can invite members' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, full_name, job_title, phone, team_role } = body as {
    email: string
    password: string
    full_name?: string
    job_title?: string
    phone?: string
    team_role?: string
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }

  // The org ID is the profile of the top-level client (not a team member)
  const orgId = callerProfile.parent_client_id ?? callerProfile.id

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Fetch org company name
  const { data: orgProfile } = await admin
    .from('profiles')
    .select('company_name')
    .eq('id', orgId)
    .single()

  // Pre-register as a CLIENT team member — trigger will detect parent_client_id
  const { error: pendingError } = await admin.from('pending_users').upsert(
    {
      email,
      role: 'CLIENT',
      company_name: orgProfile?.company_name ?? '',
      parent_client_id: orgId,
      team_role: (team_role ?? 'BUYER') as 'OWNER' | 'ADMIN' | 'BUYER' | 'APPROVER' | 'VIEWER',
      full_name: full_name ?? null,
      job_title: job_title ?? null,
      phone: phone ?? null,
    },
    { onConflict: 'email' },
  )
  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 500 })
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  })
  if (createError) {
    await admin.from('pending_users').delete().eq('email', email)
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  if (created.user) {
    await admin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('user_id', created.user.id)
  }

  return NextResponse.json({ success: true, user_id: created.user?.id })
}
