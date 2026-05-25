/**
 * auto-quote — Generate AUTO_DRAFT quotes for a new RFQ.
 *
 * Called after an RFQ + its items are inserted. Finds supplier products with
 * auto_quote=true that match items by master_product_id, groups them by
 * supplier, creates one AUTO_DRAFT quote per supplier with margin-applied
 * pricing, then either releases instantly (INSTANT window) or schedules a
 * delayed release via the `cron` function.
 *
 * POST { rfq_id: string }
 * Returns { created: number, instant_sent: number }
 */

import { handleCors, json, err } from '../_shared/cors.ts'
import { createServiceClient, VAT_RATE, round2 } from '../_shared/supabase.ts'

const REVIEW_WINDOW_MS: Record<string, number> = {
  INSTANT: 0,
  MIN_30: 30 * 60 * 1000,
  HR_2: 2 * 60 * 60 * 1000,
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  let body: { rfq_id?: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON')
  }
  const { rfq_id } = body
  if (!rfq_id) return err('rfq_id required')

  const db = createServiceClient()

  const { data: rfq } = await db.from('rfqs').select('*').eq('id', rfq_id).single()
  if (!rfq) return err('RFQ not found', 404)

  const { data: clientProfile } = await db.from('profiles').select('*').eq('id', rfq.client_id).single()
  if (!clientProfile) return err('Client profile not found', 404)

  const { data: rfqItems } = await db.from('rfq_items' as any).select('*').eq('rfq_id', rfq_id)
  const items: any[] = rfqItems ?? []
  if (items.length === 0) return json({ created: 0, instant_sent: 0 })

  const { data: marginSettings } = await db.from('margin_settings' as any).select('*')
  const settings: any[] = marginSettings ?? []

  function resolveMargin(categoryString?: string): number {
    const clientRow = settings.find((s: any) => s.type === 'CLIENT' && s.client_id === rfq.client_id)
    if (clientRow) return clientRow.margin_percent
    if (categoryString) {
      const catRow = settings.find((s: any) => s.type === 'CATEGORY' && s.category === categoryString)
      if (catRow) return catRow.margin_percent
    }
    const globalRow = settings.find((s: any) => s.type === 'GLOBAL')
    return globalRow?.margin_percent ?? 0
  }

  // Group matching products by supplier_id
  const bySupplier = new Map<string, { product: any; rfq_item_id: string; quantity: number }[]>()

  for (const item of items) {
    if (!item.master_product_id) continue
    const { data: products } = await db
      .from('products')
      .select('*')
      .eq('master_product_id', item.master_product_id)
      .eq('approval_status', 'APPROVED')
      .eq('auto_quote', true)
    for (const product of products ?? []) {
      if (product.availability_status === 'OUT_OF_STOCK') continue
      const arr = bySupplier.get(product.supplier_id) ?? []
      arr.push({ product, rfq_item_id: item.id, quantity: item.quantity })
      bySupplier.set(product.supplier_id, arr)
    }
  }

  let created = 0
  let instantSent = 0

  for (const [supplierId, matches] of bySupplier.entries()) {
    const { data: existing } = await db
      .from('quotes')
      .select('id')
      .eq('rfq_id', rfq_id)
      .eq('supplier_id', supplierId)
      .maybeSingle()
    if (existing) continue

    const windows = matches.map((m) => m.product.review_window ?? 'INSTANT')
    const window = windows.includes('HR_2') ? 'HR_2' : windows.includes('MIN_30') ? 'MIN_30' : 'INSTANT'
    const reviewMs = REVIEW_WINDOW_MS[window] ?? 0
    const reviewUntil = reviewMs > 0 ? new Date(Date.now() + reviewMs).toISOString() : null

    const { data: quote, error: qErr } = await db
      .from('quotes')
      .insert({
        rfq_id,
        supplier_id: supplierId,
        status: reviewMs === 0 ? 'PENDING_ADMIN' : 'AUTO_DRAFT',
        source: reviewMs === 0 ? 'AUTO_SENT' : 'AUTO_DRAFT',
        review_until: reviewUntil,
        revision_count: 0,
      })
      .select()
      .single()
    if (qErr || !quote) continue

    const quoteItemInserts = matches.map((m) => {
      const margin = resolveMargin(m.product.category)
      const unitBeforeVat = round2(m.product.cost_price * (1 + margin / 100))
      const unitWithVat = round2(unitBeforeVat * (1 + VAT_RATE))
      return {
        quote_id: quote.id,
        rfq_item_id: m.rfq_item_id,
        description: m.product.name,
        quantity: m.quantity,
        unit: 'pcs',
        unit_price: unitBeforeVat,
        vat_rate: VAT_RATE * 100,
        total_price: round2(unitWithVat * m.quantity),
      }
    })
    await db.from('quote_items' as any).insert(quoteItemInserts)

    await db.from('audit_log' as any).insert({
      action: 'auto_quote.draft.create',
      target_type: 'quote',
      target_id: quote.id,
      details: { rfq_id, supplier_id: supplierId, review_window: window, line_count: matches.length },
    })

    created++
    if (reviewMs === 0) instantSent++
  }

  return json({ created, instant_sent: instantSent })
})
