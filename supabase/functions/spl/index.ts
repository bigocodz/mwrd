/**
 * spl — SPL (Saudi Post National Address) verification.
 *
 * POST {
 *   profile_id: string,
 *   address: {
 *     building_number?: string,
 *     street?: string,
 *     district?: string,
 *     city?: string,
 *     postal_code?: string,
 *     additional_number?: string,
 *   }
 * }
 *
 * Requires building_number, postal_code, and city.
 * Calls SPL API, updates profiles.national_address, writes spl_sync_log + audit_log.
 *
 * Returns { ok, status, shortAddress? }
 */

import { handleCors, json, err } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SPL_API_KEY = Deno.env.get('SPL_API_KEY') ?? ''
const SPL_BASE_URL =
  Deno.env.get('SPL_BASE_URL') ?? 'https://apina.address.gov.sa/NationalAddress/v3.1'
const MOCK_MODE = !SPL_API_KEY

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_RESULT = { shortAddress: 'AAAA1234', verified: true }

// ---------------------------------------------------------------------------
// Address input type
// ---------------------------------------------------------------------------
interface AddressInput {
  building_number?: string
  street?: string
  district?: string
  city?: string
  postal_code?: string
  additional_number?: string
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  let body: { profile_id?: string; address?: AddressInput }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON')
  }

  const { profile_id, address } = body

  if (!profile_id) return err('profile_id required')
  if (!address) return err('address required')

  const { building_number, street, district, city, postal_code, additional_number } = address

  if (!building_number || !postal_code || !city) {
    return err('address.building_number, address.postal_code, and address.city are required')
  }

  const db = createServiceClient()
  const startMs = Date.now()

  // -------------------------------------------------------------------------
  // Mock mode
  // -------------------------------------------------------------------------
  if (MOCK_MODE) {
    console.log('[spl] MOCK mode — skipping external call')

    await db.from('profiles').update({
      national_address: {
        building_number,
        street,
        district,
        city,
        postal_code,
        additional_number,
        short_address: MOCK_RESULT.shortAddress,
        verified: true,
      },
    }).eq('id', profile_id)

    const duration_ms = Date.now() - startMs

    await db.from('spl_sync_log' as any).insert({
      profile_id,
      status: 'MOCK',
      http_status: null,
      short_address: MOCK_RESULT.shortAddress,
      duration_ms,
    })

    await db.from('audit_log' as any).insert({
      action: 'spl.verify',
      target_type: 'profile',
      target_id: profile_id,
    })

    return json({ ok: true, status: 'MOCK', shortAddress: MOCK_RESULT.shortAddress })
  }

  // -------------------------------------------------------------------------
  // Live call — build query params
  // -------------------------------------------------------------------------
  const params = new URLSearchParams()
  params.set('buildingnumber', building_number)
  params.set('zipcode', postal_code)
  params.set('city', city)
  if (street) params.set('streetname', street)
  if (district) params.set('district', district)
  if (additional_number) params.set('additionalnumber', additional_number)
  params.set('language', 'E')
  params.set('encode', 'utf8')

  const url = `${SPL_BASE_URL}/Address/shortaddress?${params.toString()}`

  let httpStatus: number | null = null
  let responseBody: unknown = null

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'api-key': SPL_API_KEY,
      },
    })
    httpStatus = res.status
    try {
      responseBody = await res.json()
    } catch {
      responseBody = null
    }

    const duration_ms = Date.now() - startMs

    if (res.status === 404) {
      await db.from('spl_sync_log' as any).insert({
        profile_id,
        status: 'NOT_FOUND',
        http_status: httpStatus,
        short_address: null,
        duration_ms,
      })
      await db.from('audit_log' as any).insert({
        action: 'spl.verify',
        target_type: 'profile',
        target_id: profile_id,
      })
      return json({ ok: false, status: 'NOT_FOUND' })
    }

    if (!res.ok) {
      await db.from('spl_sync_log' as any).insert({
        profile_id,
        status: 'API_ERROR',
        http_status: httpStatus,
        short_address: null,
        duration_ms,
      })
      await db.from('audit_log' as any).insert({
        action: 'spl.verify',
        target_type: 'profile',
        target_id: profile_id,
      })
      return json({
        ok: false,
        status: 'API_ERROR',
        errorMessage: `SPL returned HTTP ${res.status}`,
      })
    }

    // The SPL response can include an array of addresses; we take the first match.
    const data = responseBody as Record<string, unknown>
    const addresses = (data.Addresses ?? data.addresses ?? []) as Record<string, unknown>[]
    const matched = addresses[0] ?? null

    if (!matched) {
      await db.from('spl_sync_log' as any).insert({
        profile_id,
        status: 'NOT_FOUND',
        http_status: httpStatus,
        short_address: null,
        duration_ms,
      })
      await db.from('audit_log' as any).insert({
        action: 'spl.verify',
        target_type: 'profile',
        target_id: profile_id,
      })
      return json({ ok: false, status: 'NOT_FOUND' })
    }

    // Detect mismatches: SPL may return a result for a nearby address but with
    // a different building number — treat as MISMATCH if returned building number
    // doesn't match input.
    const returnedBuilding = (matched.BuildingNumber ?? matched.buildingNumber ?? '') as string
    if (returnedBuilding && returnedBuilding !== building_number) {
      await db.from('spl_sync_log' as any).insert({
        profile_id,
        status: 'MISMATCH',
        http_status: httpStatus,
        short_address: null,
        duration_ms,
      })
      await db.from('audit_log' as any).insert({
        action: 'spl.verify',
        target_type: 'profile',
        target_id: profile_id,
      })
      return json({ ok: false, status: 'MISMATCH' })
    }

    const shortAddress = (matched.ShortAddress ?? matched.shortAddress ?? '') as string

    await db.from('profiles').update({
      national_address: {
        building_number,
        street,
        district,
        city,
        postal_code,
        additional_number,
        short_address: shortAddress,
        verified: true,
        raw: matched,
      },
    }).eq('id', profile_id)

    await db.from('spl_sync_log' as any).insert({
      profile_id,
      status: 'VERIFIED',
      http_status: httpStatus,
      short_address: shortAddress,
      duration_ms,
    })

    await db.from('audit_log' as any).insert({
      action: 'spl.verify',
      target_type: 'profile',
      target_id: profile_id,
    })

    return json({ ok: true, status: 'VERIFIED', shortAddress })
  } catch (e: unknown) {
    const msg = (e as Error).message ?? 'Network error'
    const duration_ms = Date.now() - startMs

    await db.from('spl_sync_log' as any).insert({
      profile_id,
      status: 'NETWORK_ERROR',
      http_status: null,
      short_address: null,
      duration_ms,
    })
    await db.from('audit_log' as any).insert({
      action: 'spl.verify',
      target_type: 'profile',
      target_id: profile_id,
    })

    return json({ ok: false, status: 'NETWORK_ERROR', errorMessage: msg })
  }
})
