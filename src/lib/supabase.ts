import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// supabase client สำหรับ realtime broadcast เท่านั้น (ไม่ใช้ db, ไม่ใช้ auth)
// ถ้า env ไม่ตั้ง → return null ให้ ui fallback เป็น single-player
let cached: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return null
  }

  cached = createClient(url, key, {
    realtime: {
      params: { eventsPerSecond: 10 },
    },
    // ไม่ persist session เพราะไม่ใช้ auth
    auth: { persistSession: false },
  })
  return cached
}

// flag ให้ ui ตรวจว่า realtime พร้อมไหม
export function isRealtimeReady(): boolean {
  return getSupabase() !== null
}
