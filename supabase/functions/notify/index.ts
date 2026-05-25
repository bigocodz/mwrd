/**
 * notify — Insert an in-app notification row and optionally dispatch email.
 *
 * POST {
 *   user_id: string
 *   title: string
 *   message?: string
 *   link?: string
 *   event_type?: string
 * }
 *
 * Email is sent via Resend when RESEND_API_KEY is set. Falls back to mock
 * mode (logs but doesn't send) when the key is absent — lets the platform
 * run end-to-end in dev without credentials.
 */

import { handleCors, json, err } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'

const PORTAL_BASE = Deno.env.get('MWRD_PORTAL_URL') ?? 'https://app.mwrd.sa'
const FROM = Deno.env.get('RESEND_FROM') ?? 'MWRD <notifications@mwrd.sa>'

function absolutize(link?: string | null): string | null {
  if (!link) return null
  if (link.startsWith('http')) return link
  return `${PORTAL_BASE.replace(/\/+$/, '')}${link}`
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const start = Date.now()
  if (!apiKey) {
    console.log('[notify] MOCK email to', to, 'subject:', subject)
    return { ok: true, status: 'MOCK', durationMs: Date.now() - start }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, status: 'FAILED', errorMessage: `Resend ${res.status}: ${text.slice(0, 200)}`, durationMs: Date.now() - start }
    }
    return { ok: true, status: 'SUCCESS', durationMs: Date.now() - start }
  } catch (e: any) {
    return { ok: false, status: 'FAILED', errorMessage: String(e?.message ?? e), durationMs: Date.now() - start }
  }
}

function buildEmailHtml(title: string, message: string | null | undefined, link: string | null): string {
  const linkHtml = link
    ? `<p style="margin:20px 0"><a href="${link}" style="display:inline-block;padding:12px 24px;background:#ff6d43;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View in MWRD</a></p>`
    : ''
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
<h2 style="color:#ff6d43;margin-bottom:8px">${title}</h2>
${message ? `<p style="color:#555;line-height:1.6">${message}</p>` : ''}
${linkHtml}
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="font-size:12px;color:#999">MWRD Connect — B2B Procurement Platform</p>
</body></html>`
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  let body: { user_id?: string; title?: string; message?: string; link?: string; event_type?: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON')
  }

  const { user_id, title, message, link, event_type } = body
  if (!user_id || !title) return err('user_id and title required')

  const db = createServiceClient()

  const { data: notification, error: notifErr } = await db
    .from('notifications')
    .insert({ user_id, title, message: message ?? null, read: false, link: link ?? null, event_type: event_type ?? null })
    .select()
    .single()
  if (notifErr) return err(notifErr.message, 500)

  const { data: profile } = await db
    .from('profiles')
    .select('preferred_language')
    .eq('id', user_id)
    .single()

  const { data: authUser } = await db.auth.admin.getUserById(user_id)
  const email = authUser?.user?.email

  let emailResult: { status: string; ok: boolean } = { ok: true, status: 'SKIPPED' }
  if (email) {
    const absLink = absolutize(link)
    const html = buildEmailHtml(title, message, absLink)
    emailResult = await sendEmail(email, title, html)
  }

  await db.from('dispatch_log' as any).insert({
    notification_id: notification.id,
    channel: 'email',
    status: emailResult.status,
    recipient: email ?? null,
  }).then(() => {})

  return json({ ok: true, notification_id: notification.id, email_status: emailResult.status })
})
