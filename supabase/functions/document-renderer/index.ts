/**
 * document-renderer — Render documents as HTML.
 *
 * POST { template: 'invoice'|'quote'|'delivery_note'|'contract', id: string }
 *
 * Loads the relevant record and returns a branded HTML document as text/html.
 * On record-not-found, returns JSON 404 error.
 */

import { handleCors, err } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'

const BRAND_COLOR = '#ff6d43'
const COMPANY_INFO = 'MWRD Connect · Riyadh, Saudi Arabia · support@mwrdconnect.com'

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    },
  })
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function sar(n?: number | null): string {
  if (n == null) return '—'
  return `SAR ${n.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fieldRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#555;font-size:13px;white-space:nowrap;">${label}</td>
      <td style="padding:6px 0;font-size:13px;color:#111;">${value}</td>
    </tr>`
}

function lineItemsTable(headers: string[], rows: string[][]): string {
  const ths = headers.map((h) => `<th style="padding:8px 10px;text-align:left;background:${BRAND_COLOR};color:#fff;font-size:12px;">${h}</th>`).join('')
  const trs = rows.map((row) => {
    const tds = row.map((c) => `<td style="padding:7px 10px;font-size:12px;border-bottom:1px solid #eee;">${c}</td>`).join('')
    return `<tr>${tds}</tr>`
  }).join('')
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:20px;">
      <thead><tr>${ths}</tr></thead>
      <tbody>${trs}</tbody>
    </table>`
}

function renderPage(title: string, docTypeBadge: string, fieldsHtml: string, itemsHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f4;">
  <div style="max-width:820px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <!-- Header -->
    <div style="background:${BRAND_COLOR};padding:24px 32px;display:flex;justify-content:space-between;align-items:center;">
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-.5px;">MWRD Connect</div>
      <div style="color:#fff;font-size:13px;opacity:.85;">${docTypeBadge}</div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;">${fieldsHtml}</table>
      ${itemsHtml}
    </div>

    <!-- Footer -->
    <div style="background:#f9f9f9;border-top:1px solid #eee;padding:16px 32px;text-align:center;font-size:11px;color:#888;">
      ${COMPANY_INFO}
    </div>
  </div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Template renderers
// ---------------------------------------------------------------------------

async function renderInvoice(id: string): Promise<Response> {
  const db = createServiceClient()

  const { data: invoice } = await db
    .from('client_invoices')
    .select('*, profiles(*)')
    .eq('id', id)
    .single()

  if (!invoice) return err('Not found', 404)

  const client = invoice.profiles as Record<string, unknown> | null
  const clientName = (client?.legal_name_en ?? client?.full_name ?? '—') as string

  const fields = [
    fieldRow('Invoice #', invoice.invoice_number ?? id),
    fieldRow('Issue Date', formatDate(invoice.issue_date)),
    fieldRow('Due Date', formatDate(invoice.due_date)),
    fieldRow('Client', clientName),
    fieldRow('Status', invoice.status ?? '—'),
    fieldRow('ZATCA Status', invoice.zatca_status ?? '—'),
    fieldRow('Subtotal', sar(invoice.subtotal)),
    fieldRow('VAT (15%)', sar(invoice.vat_amount)),
    fieldRow('Total', sar(invoice.total_amount)),
  ].join('')

  const lineItems: Record<string, unknown>[] = Array.isArray(invoice.line_items)
    ? invoice.line_items as Record<string, unknown>[]
    : []

  const itemRows = lineItems.map((li) => [
    String(li.description ?? li.name ?? '—'),
    String(li.quantity ?? 1),
    sar(Number(li.unit_price ?? 0)),
    sar(Number(li.total_price ?? li.line_total ?? 0)),
  ])

  const itemsHtml = itemRows.length
    ? lineItemsTable(['Description', 'Qty', 'Unit Price', 'Total'], itemRows)
    : ''

  const html = renderPage(
    `Invoice ${invoice.invoice_number ?? id}`,
    `TAX INVOICE · ${formatDate(invoice.issue_date)}`,
    fields,
    itemsHtml,
  )
  return htmlResponse(html)
}

async function renderQuote(id: string): Promise<Response> {
  const db = createServiceClient()

  const { data: quote } = await db
    .from('quotes')
    .select('*, rfqs(*), profiles(*)')
    .eq('id', id)
    .single()

  if (!quote) return err('Not found', 404)

  const rfq = quote.rfqs as Record<string, unknown> | null
  const supplier = quote.profiles as Record<string, unknown> | null
  const supplierName = (supplier?.legal_name_en ?? supplier?.full_name ?? '—') as string

  const { data: quoteItems } = await db
    .from('quote_items' as any)
    .select('*')
    .eq('quote_id', id)

  const items: Record<string, unknown>[] = quoteItems ?? []

  const fields = [
    fieldRow('Quote #', quote.quote_number ?? id),
    fieldRow('Date', formatDate(quote.created_at)),
    fieldRow('Valid Until', formatDate(quote.valid_until ?? null)),
    fieldRow('RFQ', (rfq?.rfq_number ?? rfq?.id ?? '—') as string),
    fieldRow('Supplier', supplierName),
    fieldRow('Status', quote.status ?? '—'),
    fieldRow('Subtotal', sar(quote.subtotal)),
    fieldRow('VAT (15%)', sar(quote.vat_amount)),
    fieldRow('Total', sar(quote.total_amount)),
  ].join('')

  const itemRows = items.map((li) => [
    String(li.description ?? li.name ?? li.item_name ?? '—'),
    String(li.quantity ?? 1),
    sar(Number(li.unit_price ?? 0)),
    String(li.is_quoted === false ? 'Not quoted' : sar(Number(li.total_price ?? 0))),
  ])

  const itemsHtml = itemRows.length
    ? lineItemsTable(['Description', 'Qty', 'Unit Price', 'Total'], itemRows)
    : ''

  const html = renderPage(
    `Quote ${quote.quote_number ?? id}`,
    `QUOTATION · ${formatDate(quote.created_at)}`,
    fields,
    itemsHtml,
  )
  return htmlResponse(html)
}

async function renderDeliveryNote(id: string): Promise<Response> {
  const db = createServiceClient()

  const { data: note } = await db
    .from('delivery_notes' as any)
    .select('*')
    .eq('id', id)
    .single()

  if (!note) return err('Not found', 404)

  const n = note as Record<string, unknown>

  const fields = [
    fieldRow('Delivery Note #', (n.note_number ?? id) as string),
    fieldRow('Date', formatDate((n.delivery_date ?? n.created_at) as string | null)),
    fieldRow('Order #', (n.order_number ?? n.order_id ?? '—') as string),
    fieldRow('Recipient', (n.recipient_name ?? '—') as string),
    fieldRow('Address', (n.delivery_address ?? '—') as string),
    fieldRow('Status', (n.status ?? '—') as string),
    fieldRow('Notes', (n.notes ?? '—') as string),
  ].join('')

  const lineItems: Record<string, unknown>[] = Array.isArray(n.items)
    ? n.items as Record<string, unknown>[]
    : []

  const itemRows = lineItems.map((li) => [
    String(li.description ?? li.name ?? '—'),
    String(li.quantity ?? '—'),
    String(li.unit ?? '—'),
  ])

  const itemsHtml = itemRows.length
    ? lineItemsTable(['Description', 'Qty', 'Unit'], itemRows)
    : ''

  const html = renderPage(
    `Delivery Note ${n.note_number ?? id}`,
    `DELIVERY NOTE · ${formatDate((n.delivery_date ?? n.created_at) as string | null)}`,
    fields,
    itemsHtml,
  )
  return htmlResponse(html)
}

async function renderContract(id: string): Promise<Response> {
  const db = createServiceClient()

  const { data: contract } = await db
    .from('contracts' as any)
    .select('*')
    .eq('id', id)
    .single()

  if (!contract) return err('Not found', 404)

  const c = contract as Record<string, unknown>

  const fields = [
    fieldRow('Contract #', (c.contract_number ?? id) as string),
    fieldRow('Title', (c.title ?? '—') as string),
    fieldRow('Start Date', formatDate((c.start_date) as string | null)),
    fieldRow('End Date', formatDate((c.end_date) as string | null)),
    fieldRow('Value', sar((c.total_value ?? c.contract_value) as number | null)),
    fieldRow('Status', (c.status ?? '—') as string),
    fieldRow('Parties', (c.parties ?? '—') as string),
  ].join('')

  const clauses: Record<string, unknown>[] = Array.isArray(c.clauses)
    ? c.clauses as Record<string, unknown>[]
    : []

  const clauseRows = clauses.map((cl, i) => [
    String(i + 1),
    String(cl.title ?? cl.heading ?? `Clause ${i + 1}`),
    String(cl.summary ?? cl.text ?? '').slice(0, 120) + (String(cl.summary ?? cl.text ?? '').length > 120 ? '…' : ''),
  ])

  const itemsHtml = clauseRows.length
    ? lineItemsTable(['#', 'Clause', 'Summary'], clauseRows)
    : ''

  const html = renderPage(
    `Contract ${c.contract_number ?? id}`,
    `CONTRACT · ${formatDate((c.start_date) as string | null)}`,
    fields,
    itemsHtml,
  )
  return htmlResponse(html)
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  let body: { template?: string; id?: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON')
  }

  const { template, id } = body
  if (!template) return err('template required')
  if (!id) return err('id required')

  switch (template) {
    case 'invoice':
      return renderInvoice(id)
    case 'quote':
      return renderQuote(id)
    case 'delivery_note':
      return renderDeliveryNote(id)
    case 'contract':
      return renderContract(id)
    default:
      return err(`Unknown template: ${template}`)
  }
})
