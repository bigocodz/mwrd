/**
 * wafeq — Wafeq (Saudi accounting platform) integration.
 *
 * POST { action: 'ensure_contact'|'submit_invoice'|'reconcile', ...args }
 *
 * Actions:
 *   ensure_contact  { profile_id }  → create/update Wafeq contact from supplier profile
 *   submit_invoice  { invoice_id }  → submit client_invoice to Wafeq
 *   reconcile       {}              → fetch pending Wafeq invoices and sync statuses back
 *
 * Returns { ok, status, data?, errorMessage? }
 */

import { handleCors, json, err } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const WAFEQ_API_KEY = Deno.env.get('WAFEQ_API_KEY') ?? ''
const WAFEQ_BASE_URL = Deno.env.get('WAFEQ_BASE_URL') ?? 'https://api.wafeq.com/v1'
const WAFEQ_ENV = Deno.env.get('WAFEQ_ENV') ?? 'simulation'
const MOCK_MODE = !WAFEQ_API_KEY

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic integer hash of a string (djb2). */
function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
  }
  return h >>> 0 // unsigned 32-bit
}

function idempotencyKey(action: string, entityId: string): string {
  return String(hashString(`${action}|${entityId}`))
}

/** Wafeq HTTP request with one automatic retry on 5xx. */
async function wafeqFetch(
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = `${WAFEQ_BASE_URL}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Api-Key ${WAFEQ_API_KEY}`,
    ...(options.headers as Record<string, string> ?? {}),
  }

  const attempt = async () => {
    try {
      const res = await fetch(url, { ...options, headers })
      let body: unknown
      try {
        body = await res.json()
      } catch {
        body = null
      }
      return { ok: res.ok, status: res.status, body }
    } catch (e: unknown) {
      throw { network: true, message: (e as Error).message }
    }
  }

  const result = await attempt()
  if (result.status >= 500) {
    // Retry once after 1 second
    await new Promise((r) => setTimeout(r, 1000))
    return await attempt()
  }
  return result
}

function syncLogRow(
  action: string,
  entityId: string,
  status: string,
  httpStatus: number | null,
  details: unknown,
) {
  return {
    action,
    entity_id: entityId,
    status,
    http_status: httpStatus,
    details,
    created_at: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Action: ensure_contact
// ---------------------------------------------------------------------------
async function ensureContact(profileId: string): Promise<Response> {
  const db = createServiceClient()

  const { data: profile } = await db.from('profiles').select('*').eq('id', profileId).single()
  if (!profile) return err('Profile not found', 404)

  if (MOCK_MODE) {
    console.log('[wafeq] MOCK mode — ensure_contact skipping external call')
    const mockContactId = `mock-contact-${profileId}`
    await db.from('profiles').update({ wafeq_contact_id: mockContactId }).eq('id', profileId)
    await db.from('wafeq_sync_log' as any).insert(
      syncLogRow('ensure_contact', profileId, 'MOCK', null, { mock: true, contactId: mockContactId }),
    )
    return json({ ok: true, status: 'MOCK', data: { contactId: mockContactId } })
  }

  const payload = {
    name: profile.legal_name_en ?? profile.full_name ?? profile.id,
    name_ar: profile.legal_name_ar ?? undefined,
    email: profile.email ?? undefined,
    phone: profile.phone ?? undefined,
    tax_number: profile.vat_number ?? undefined,
    environment: WAFEQ_ENV,
  }

  let result
  try {
    result = await wafeqFetch('/contacts/', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'X-Idempotency-Key': idempotencyKey('ensure_contact', profileId) },
    })
  } catch (e: unknown) {
    const msg = (e as { message?: string }).message ?? 'Network error'
    await db.from('wafeq_sync_log' as any).insert(
      syncLogRow('ensure_contact', profileId, 'NETWORK_ERROR', null, { error: msg }),
    )
    return json({ ok: false, status: 'NETWORK_ERROR', errorMessage: msg })
  }

  if (!result.ok) {
    await db.from('wafeq_sync_log' as any).insert(
      syncLogRow('ensure_contact', profileId, 'API_ERROR', result.status, result.body),
    )
    return json({
      ok: false,
      status: 'API_ERROR',
      errorMessage: `Wafeq returned HTTP ${result.status}`,
      data: result.body,
    })
  }

  const contactData = result.body as Record<string, unknown>
  const contactId = contactData.id as string

  await db.from('profiles').update({ wafeq_contact_id: contactId }).eq('id', profileId)
  await db.from('wafeq_sync_log' as any).insert(
    syncLogRow('ensure_contact', profileId, 'SUCCESS', result.status, { contactId }),
  )

  return json({ ok: true, status: 'SUCCESS', data: { contactId } })
}

// ---------------------------------------------------------------------------
// Action: submit_invoice
// ---------------------------------------------------------------------------
async function submitInvoice(invoiceId: string): Promise<Response> {
  const db = createServiceClient()

  const { data: invoice } = await db
    .from('client_invoices')
    .select('*, profiles(*)')
    .eq('id', invoiceId)
    .single()
  if (!invoice) return err('Invoice not found', 404)

  const client = invoice.profiles as Record<string, unknown> | null

  if (MOCK_MODE) {
    console.log('[wafeq] MOCK mode — submit_invoice skipping external call')
    const mockInvoiceId = `mock-invoice-${invoiceId}`
    await db
      .from('client_invoices')
      .update({ zatca_status: 'SUBMITTED', wafeq_invoice_id: mockInvoiceId })
      .eq('id', invoiceId)
    await db.from('wafeq_sync_log' as any).insert(
      syncLogRow('submit_invoice', invoiceId, 'MOCK', null, { mock: true, wafeqInvoiceId: mockInvoiceId }),
    )
    return json({ ok: true, status: 'MOCK', data: { wafeqInvoiceId: mockInvoiceId } })
  }

  const payload = {
    environment: WAFEQ_ENV,
    invoice_number: invoice.invoice_number ?? invoiceId,
    issue_date: invoice.issue_date ?? new Date().toISOString().slice(0, 10),
    due_date: invoice.due_date ?? undefined,
    customer_contact_id: client?.wafeq_contact_id ?? undefined,
    lines: invoice.line_items ?? [],
    currency: invoice.currency ?? 'SAR',
    notes: invoice.notes ?? undefined,
  }

  let result
  try {
    result = await wafeqFetch('/invoices/', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'X-Idempotency-Key': idempotencyKey('submit_invoice', invoiceId) },
    })
  } catch (e: unknown) {
    const msg = (e as { message?: string }).message ?? 'Network error'
    await db.from('wafeq_sync_log' as any).insert(
      syncLogRow('submit_invoice', invoiceId, 'NETWORK_ERROR', null, { error: msg }),
    )
    return json({ ok: false, status: 'NETWORK_ERROR', errorMessage: msg })
  }

  if (!result.ok) {
    await db.from('wafeq_sync_log' as any).insert(
      syncLogRow('submit_invoice', invoiceId, 'API_ERROR', result.status, result.body),
    )
    return json({
      ok: false,
      status: 'API_ERROR',
      errorMessage: `Wafeq returned HTTP ${result.status}`,
      data: result.body,
    })
  }

  const invoiceData = result.body as Record<string, unknown>
  const wafeqInvoiceId = invoiceData.id as string

  await db
    .from('client_invoices')
    .update({ zatca_status: 'SUBMITTED', wafeq_invoice_id: wafeqInvoiceId })
    .eq('id', invoiceId)
  await db.from('wafeq_sync_log' as any).insert(
    syncLogRow('submit_invoice', invoiceId, 'SUCCESS', result.status, { wafeqInvoiceId }),
  )

  return json({ ok: true, status: 'SUCCESS', data: { wafeqInvoiceId } })
}

// ---------------------------------------------------------------------------
// Action: reconcile
// ---------------------------------------------------------------------------
async function reconcile(): Promise<Response> {
  const db = createServiceClient()

  if (MOCK_MODE) {
    console.log('[wafeq] MOCK mode — reconcile skipping external call')
    return json({ ok: true, status: 'MOCK', data: { synced: 0 } })
  }

  let result
  try {
    result = await wafeqFetch('/invoices/?status=pending', { method: 'GET' })
  } catch (e: unknown) {
    const msg = (e as { message?: string }).message ?? 'Network error'
    return json({ ok: false, status: 'NETWORK_ERROR', errorMessage: msg })
  }

  if (!result.ok) {
    return json({
      ok: false,
      status: 'API_ERROR',
      errorMessage: `Wafeq returned HTTP ${result.status}`,
      data: result.body,
    })
  }

  const wafeqInvoices = (result.body as { results?: unknown[] }).results ?? []
  let synced = 0

  for (const inv of wafeqInvoices as Record<string, unknown>[]) {
    const wafeqId = inv.id as string
    const wafeqStatus = inv.status as string | undefined

    if (!wafeqId || !wafeqStatus) continue

    const zatcaStatus = wafeqStatus.toUpperCase()
    const { error } = await db
      .from('client_invoices')
      .update({ zatca_status: zatcaStatus })
      .eq('wafeq_invoice_id', wafeqId)
    if (!error) synced++
  }

  return json({ ok: true, status: 'SUCCESS', data: { synced } })
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  let body: { action?: string; profile_id?: string; invoice_id?: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON')
  }

  const { action, profile_id, invoice_id } = body

  switch (action) {
    case 'ensure_contact':
      if (!profile_id) return err('profile_id required')
      return ensureContact(profile_id)

    case 'submit_invoice':
      if (!invoice_id) return err('invoice_id required')
      return submitInvoice(invoice_id)

    case 'reconcile':
      return reconcile()

    default:
      return err(`Unknown action: ${action}`)
  }
})
