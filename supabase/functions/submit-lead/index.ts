/**
 * submit-lead — Public HTTP endpoint for lead capture from the marketing site.
 * No auth required. Inserts into the `leads` table.
 *
 * POST { full_name, email, company_name?, cr_number?, vat_number?, phone?, notes?, account_type? }
 */

import { handleCors, json, err } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON')
  }

  const full_name = (body.full_name ?? '').trim()
  const email = (body.email ?? '').trim()
  if (!full_name || !email) return err('full_name and email are required')

  const account_type =
    body.account_type === 'CLIENT' || body.account_type === 'SUPPLIER' ? body.account_type : null

  const db = createServiceClient()

  const { error } = await db.from('leads' as any).insert({
    full_name,
    email,
    company_name: body.company_name?.trim() || null,
    cr_number: body.cr_number?.trim() || null,
    vat_number: body.vat_number?.trim() || null,
    phone: body.phone?.trim() || null,
    notes: body.notes?.trim() || null,
    account_type,
    status: 'NEW',
  })

  if (error) return err('Failed to submit lead. Please try again.', 500)

  return json({ ok: true })
})
