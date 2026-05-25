/**
 * cron — Dispatcher for all scheduled jobs. Each job is identified by `job`
 * query parameter. Called by pg_cron via `net.http_post`.
 *
 * Jobs:
 *   run_rfq_schedules         — Clone due recurring RFQs (hourly)
 *   flag_overdue_invoices     — Mark client_invoices as OVERDUE (daily 1am UTC)
 *   wafeq_reconciliation      — Pull Wafeq invoice statuses (daily 2am UTC)
 *   escalate_stale_approvals  — Escalate past-SLA approval steps (hourly)
 *   sweep_expired_auto_drafts — Release AUTO_DRAFTs past review_until (every 5 min)
 *   expire_stale_carts        — Zero cart_quantity entries older than 7 days (hourly)
 */

import { handleCors, json, err } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const url = new URL(req.url)
  const job = url.searchParams.get('job') ?? (await req.json().catch(() => ({}))).job

  if (!job) return err('job parameter required')

  const db = createServiceClient()
  const now = new Date().toISOString()

  switch (job) {
    case 'run_rfq_schedules': {
      const { data: schedules } = await db
        .from('rfq_schedules' as any)
        .select('*')
        .eq('active', true)
        .lte('next_run_at', now)

      let cloned = 0
      for (const sched of schedules ?? []) {
        const { data: sourceRfq } = await db.from('rfqs').select('*').eq('id', sched.rfq_id).single()
        if (!sourceRfq) continue

        const { data: newRfq, error } = await db
          .from('rfqs')
          .insert({
            client_id: sourceRfq.client_id,
            status: 'OPEN',
            category: sourceRfq.category,
            delivery_location: sourceRfq.delivery_location,
            notes: sourceRfq.notes,
            required_by: sched.next_required_by ?? null,
          })
          .select()
          .single()
        if (error || !newRfq) continue

        const { data: sourceItems } = await db
          .from('rfq_items' as any)
          .select('*')
          .eq('rfq_id', sched.rfq_id)
        if ((sourceItems ?? []).length > 0) {
          await db.from('rfq_items' as any).insert(
            (sourceItems as any[]).map((i: any) => ({
              rfq_id: newRfq.id,
              description: i.description,
              quantity: i.quantity,
              unit: i.unit,
              notes: i.notes,
            })),
          )
        }

        const nextRun = advanceSchedule(sched.frequency, new Date(sched.next_run_at))
        await db
          .from('rfq_schedules' as any)
          .update({ next_run_at: nextRun.toISOString(), last_run_at: now })
          .eq('id', sched.id)

        cloned++
      }
      return json({ job, cloned })
    }

    case 'flag_overdue_invoices': {
      const { error, count } = await db
        .from('client_invoices')
        .update({ status: 'OVERDUE' })
        .eq('status', 'PENDING_PAYMENT')
        .lt('due_date', now.slice(0, 10))
        .select('id', { count: 'exact', head: true })
      if (error) return err(error.message, 500)
      return json({ job, flagged: count ?? 0 })
    }

    case 'wafeq_reconciliation': {
      const wafeqUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/wafeq`
      const res = await fetch(wafeqUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ action: 'reconcile' }),
      })
      const result = await res.json()
      return json({ job, wafeq_result: result })
    }

    case 'escalate_stale_approvals': {
      const { data: pendingRequests } = await db
        .from('approval_requests')
        .select('id, rule_id, requested_at')
        .eq('status', 'PENDING')

      let escalated = 0
      for (const req of pendingRequests ?? []) {
        const { data: rule } = await db
          .from('approval_rules' as any)
          .select('escalation_hours')
          .eq('id', req.rule_id)
          .single()
        if (!rule?.escalation_hours) continue

        const elapsed = (Date.now() - new Date(req.requested_at).getTime()) / (1000 * 60 * 60)
        if (elapsed < rule.escalation_hours) continue

        await db
          .from('approval_requests')
          .update({ status: 'ESCALATED' } as any)
          .eq('id', req.id)
        escalated++
      }
      return json({ job, escalated })
    }

    case 'sweep_expired_auto_drafts': {
      const { data: drafts } = await db
        .from('quotes')
        .select('id, review_until')
        .eq('status', 'AUTO_DRAFT')
        .lte('review_until', now)

      if ((drafts ?? []).length > 0) {
        const ids = (drafts as any[]).map((d: any) => d.id)
        await db
          .from('quotes')
          .update({ status: 'PENDING_ADMIN', source: 'AUTO_SENT', review_until: null })
          .in('id', ids)
      }
      return json({ job, released: (drafts ?? []).length })
    }

    case 'expire_stale_carts': {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { error, count } = await db
        .from('client_catalog_entries' as any)
        .update({ cart_quantity: 0 })
        .gt('cart_quantity', 0)
        .lt('updated_at', cutoff)
        .select('id', { count: 'exact', head: true })
      if (error) return err(error.message, 500)
      return json({ job, expired: count ?? 0 })
    }

    default:
      return err(`Unknown job: ${job}`, 400)
  }
})

function advanceSchedule(frequency: string, from: Date): Date {
  const d = new Date(from)
  switch (frequency) {
    case 'DAILY':
      d.setDate(d.getDate() + 1)
      break
    case 'WEEKLY':
      d.setDate(d.getDate() + 7)
      break
    case 'BIWEEKLY':
      d.setDate(d.getDate() + 14)
      break
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1)
      break
    default:
      d.setDate(d.getDate() + 7)
  }
  return d
}
