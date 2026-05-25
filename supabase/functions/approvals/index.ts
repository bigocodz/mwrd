/**
 * approvals — Check if a quote requires an approval workflow.
 *
 * Called after a quote transitions to PENDING_ADMIN. Computes the quote total,
 * finds a matching approval_rule for the client, creates an approval_request
 * record with decision rows for each step, and notifies approvers.
 *
 * POST { quote_id: string, client_id: string }
 * Returns { required: boolean, request_id?: string }
 */

import { handleCors, json, err } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  let body: { quote_id?: string; client_id?: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON')
  }
  const { quote_id, client_id } = body
  if (!quote_id || !client_id) return err('quote_id and client_id required')

  const db = createServiceClient()

  const { data: quote } = await db.from('quotes').select('*').eq('id', quote_id).single()
  if (!quote) return err('Quote not found', 404)

  const { data: rfq } = await db.from('rfqs').select('*').eq('id', quote.rfq_id).single()
  if (!rfq) return err('RFQ not found', 404)

  const { data: quoteItems } = await db.from('quote_items' as any).select('*').eq('quote_id', quote_id)
  const items: any[] = quoteItems ?? []

  const total = items.reduce((sum: number, item: any) => {
    if (item.is_quoted === false) return sum
    const qty = item.quantity ?? 1
    return sum + (item.total_price ?? (item.unit_price ?? 0) * qty)
  }, 0)

  const { data: rules } = await db.from('approval_rules' as any).select('*').eq('client_id', client_id).eq('enabled', true)
  const allRules: any[] = rules ?? []

  const rule = allRules.find((r: any) => {
    if (total < r.min_amount) return false
    if (r.max_amount != null && total > r.max_amount) return false
    if (r.category && r.category !== rfq.category) return false
    if (r.cost_center_id && r.cost_center_id !== rfq.cost_center_id) return false
    if (r.branch_id && r.branch_id !== rfq.branch_id) return false
    if (r.department_id && r.department_id !== rfq.department_id) return false
    return true
  })

  if (!rule) return json({ required: false })

  if (rule.auto_approve_threshold != null && total <= rule.auto_approve_threshold) {
    return json({ required: false })
  }

  const existingCheck = await db
    .from('approval_requests')
    .select('id')
    .eq('quote_id', quote_id)
    .maybeSingle()
  if (existingCheck.data) {
    return json({ required: true, request_id: existingCheck.data.id })
  }

  const { data: request, error: reqErr } = await db
    .from('approval_requests')
    .insert({
      quote_id,
      rfq_id: rfq.id,
      client_id,
      rule_id: rule.id,
      rule_name: rule.name,
      quote_total: total,
      status: 'PENDING',
    })
    .select()
    .single()
  if (reqErr || !request) return err(reqErr?.message ?? 'Failed to create approval request', 500)

  const { data: steps } = await db
    .from('approval_steps' as any)
    .select('*')
    .eq('rule_id', rule.id)
    .order('step_index', { ascending: true })
  const allSteps: any[] = steps ?? []

  if (allSteps.length > 0) {
    await db.from('approval_decisions' as any).insert(
      allSteps.map((step: any) => ({
        request_id: request.id,
        step_index: step.step_index,
        parallel_group: step.parallel_group ?? 0,
        approver_admin_id: step.approver_admin_id ?? null,
        status: 'PENDING',
      })),
    )
  }

  const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/notify`
  const notifyHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
  }

  const namedApprovers: string[] = allSteps.filter((s: any) => s.approver_admin_id).map((s: any) => s.approver_admin_id)

  if (namedApprovers.length > 0) {
    await Promise.all(
      namedApprovers.map((id) =>
        fetch(notifyUrl, {
          method: 'POST',
          headers: notifyHeaders,
          body: JSON.stringify({
            user_id: id,
            event_type: 'approval.required',
            title: 'Approval required',
            message: `${rule.name} triggered for SAR ${total.toFixed(2)}`,
            link: '/admin/approvals',
          }),
        }),
      ),
    )
  } else {
    const { data: admins } = await db.from('profiles').select('id').eq('role', 'ADMIN').eq('status', 'ACTIVE')
    await Promise.all(
      (admins ?? []).map((admin: any) =>
        fetch(notifyUrl, {
          method: 'POST',
          headers: notifyHeaders,
          body: JSON.stringify({
            user_id: admin.id,
            event_type: 'approval.required',
            title: 'Approval required',
            message: `${rule.name} triggered for SAR ${total.toFixed(2)}`,
            link: '/admin/approvals',
          }),
        }),
      ),
    )
  }

  return json({ required: true, request_id: request.id })
})
