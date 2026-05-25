/**
 * wafeq-webhook — Receives payment and clearance events from Wafeq.
 *
 * Security: When WAFEQ_WEBHOOK_SECRET is set, the X-Wafeq-Signature header
 * must match using constant-time comparison.
 *
 * Supported events:
 *   invoice.paid       → set client_invoices.status = 'PAID'
 *   invoice.cleared    → set client_invoices.zatca_status = 'CLEARED'
 *   invoice.voided     → set client_invoices.status = 'VOID'
 */

import { handleCors, json, err } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const secret = Deno.env.get('WAFEQ_WEBHOOK_SECRET')
  if (secret) {
    const sig = req.headers.get('X-Wafeq-Signature') ?? ''
    if (!constantTimeEqual(sig, secret)) {
      return new Response('Forbidden', { status: 403 })
    }
  }

  let event: { type?: string; data?: Record<string, unknown> }
  try {
    event = await req.json()
  } catch {
    return err('Invalid JSON')
  }

  const eventType = event.type ?? ''
  const data = event.data ?? {}
  const db = createServiceClient()

  await db.from('webhook_events' as any).insert({
    source: 'wafeq',
    event_type: eventType,
    payload: event,
    processed_at: new Date().toISOString(),
  })

  let handled = false

  if (eventType === 'invoice.paid') {
    const wafeqId = (data.invoice_id ?? data.id) as string | undefined
    if (wafeqId) {
      await db
        .from('client_invoices')
        .update({ status: 'PAID' })
        .eq('wafeq_invoice_id', wafeqId)
      handled = true
    }
  } else if (eventType === 'invoice.cleared') {
    const wafeqId = (data.invoice_id ?? data.id) as string | undefined
    if (wafeqId) {
      await db
        .from('client_invoices')
        .update({ zatca_status: 'CLEARED' })
        .eq('wafeq_invoice_id', wafeqId)
      handled = true
    }
  } else if (eventType === 'invoice.voided') {
    const wafeqId = (data.invoice_id ?? data.id) as string | undefined
    if (wafeqId) {
      await db
        .from('client_invoices')
        .update({ status: 'VOID' })
        .eq('wafeq_invoice_id', wafeqId)
      handled = true
    }
  } else {
    console.log('[wafeq-webhook] unhandled event type:', eventType)
  }

  return json({ ok: true, event_type: eventType, handled })
})
