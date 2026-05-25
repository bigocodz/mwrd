import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function createServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

export function createAnonClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_ANON_KEY')!
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

export const VAT_RATE = 0.15
export const round2 = (n: number) => Math.round(n * 100) / 100
