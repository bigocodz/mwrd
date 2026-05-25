/**
 * wathq — Wathq (Saudi Business Center) CR number verification.
 *
 * POST { profile_id: string, cr_number: string }
 *
 * Validates the CR format, calls Wathq API, updates profile with legal names
 * and sets kyc_status = 'IN_REVIEW', then writes to wathq_sync_log and audit_log.
 *
 * Returns { ok, status, legalNameAr?, legalNameEn? }
 */

import { handleCors, json, err } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const WATHQ_API_KEY = Deno.env.get('WATHQ_API_KEY') ?? ''
const WATHQ_BASE_URL = Deno.env.get('WATHQ_BASE_URL') ?? 'https://api.wathq.sa/v5'
const MOCK_MODE = !WATHQ_API_KEY

const CR_REGEX = /^\d{10}$/

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_RESULT = {
  legalNameAr: 'شركة نموذج للتجارة',
  legalNameEn: 'Sample Trading Co. LLC',
  registrationStatus: 'ACTIVE',
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  let body: { profile_id?: string; cr_number?: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON')
  }

  const { profile_id, cr_number } = body

  if (!profile_id) return err('profile_id required')
  if (!cr_number) return err('cr_number required')
  if (!CR_REGEX.test(cr_number)) return err('cr_number must be exactly 10 digits')

  const db = createServiceClient()
  const startMs = Date.now()

  // -------------------------------------------------------------------------
  // Mock mode
  // -------------------------------------------------------------------------
  if (MOCK_MODE) {
    console.log('[wathq] MOCK mode — skipping external call')

    await db.from('profiles').update({
      legal_name_ar: MOCK_RESULT.legalNameAr,
      legal_name_en: MOCK_RESULT.legalNameEn,
      kyc_status: 'IN_REVIEW',
    }).eq('id', profile_id)

    const duration_ms = Date.now() - startMs

    await db.from('wathq_sync_log' as any).insert({
      profile_id,
      cr_number,
      status: 'MOCK',
      http_status: null,
      raw_summary: MOCK_RESULT,
      duration_ms,
    })

    await db.from('audit_log' as any).insert({
      action: 'wathq.verify',
      target_type: 'profile',
      target_id: profile_id,
      details: { cr_number, status: 'MOCK' },
    })

    return json({
      ok: true,
      status: 'MOCK',
      legalNameAr: MOCK_RESULT.legalNameAr,
      legalNameEn: MOCK_RESULT.legalNameEn,
    })
  }

  // -------------------------------------------------------------------------
  // Live call
  // -------------------------------------------------------------------------
  let httpStatus: number | null = null
  let responseBody: unknown = null

  try {
    const res = await fetch(
      `${WATHQ_BASE_URL}/commercial-registrations/${encodeURIComponent(cr_number)}`,
      {
        method: 'GET',
        headers: {
          APIKey: WATHQ_API_KEY,
          Accept: 'application/json',
        },
      },
    )
    httpStatus = res.status
    try {
      responseBody = await res.json()
    } catch {
      responseBody = null
    }

    const duration_ms = Date.now() - startMs

    if (res.status === 404) {
      await db.from('wathq_sync_log' as any).insert({
        profile_id,
        cr_number,
        status: 'NOT_FOUND',
        http_status: httpStatus,
        raw_summary: responseBody,
        duration_ms,
      })
      await db.from('audit_log' as any).insert({
        action: 'wathq.verify',
        target_type: 'profile',
        target_id: profile_id,
        details: { cr_number, status: 'NOT_FOUND' },
      })
      return json({ ok: false, status: 'NOT_FOUND' })
    }

    if (!res.ok) {
      await db.from('wathq_sync_log' as any).insert({
        profile_id,
        cr_number,
        status: 'API_ERROR',
        http_status: httpStatus,
        raw_summary: responseBody,
        duration_ms,
      })
      await db.from('audit_log' as any).insert({
        action: 'wathq.verify',
        target_type: 'profile',
        target_id: profile_id,
        details: { cr_number, status: 'API_ERROR' },
      })
      return json({
        ok: false,
        status: 'API_ERROR',
        errorMessage: `Wathq returned HTTP ${res.status}`,
      })
    }

    // Success
    const data = responseBody as Record<string, unknown>
    const legalNameAr = (data.arabicName ?? data.name_ar ?? '') as string
    const legalNameEn = (data.englishName ?? data.name_en ?? '') as string

    await db.from('profiles').update({
      legal_name_ar: legalNameAr || null,
      legal_name_en: legalNameEn || null,
      kyc_status: 'IN_REVIEW',
    }).eq('id', profile_id)

    await db.from('wathq_sync_log' as any).insert({
      profile_id,
      cr_number,
      status: 'VERIFIED',
      http_status: httpStatus,
      raw_summary: { legalNameAr, legalNameEn, registrationStatus: data.status ?? data.registrationStatus },
      duration_ms,
    })

    await db.from('audit_log' as any).insert({
      action: 'wathq.verify',
      target_type: 'profile',
      target_id: profile_id,
      details: { cr_number, status: 'VERIFIED' },
    })

    return json({
      ok: true,
      status: 'VERIFIED',
      legalNameAr,
      legalNameEn,
    })
  } catch (e: unknown) {
    const msg = (e as Error).message ?? 'Network error'
    const duration_ms = Date.now() - startMs

    await db.from('wathq_sync_log' as any).insert({
      profile_id,
      cr_number,
      status: 'NETWORK_ERROR',
      http_status: null,
      raw_summary: { error: msg },
      duration_ms,
    })
    await db.from('audit_log' as any).insert({
      action: 'wathq.verify',
      target_type: 'profile',
      target_id: profile_id,
      details: { cr_number, status: 'NETWORK_ERROR' },
    })

    return json({ ok: false, status: 'NETWORK_ERROR', errorMessage: msg })
  }
})
