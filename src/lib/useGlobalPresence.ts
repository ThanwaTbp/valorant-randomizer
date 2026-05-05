'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from './supabase'

// hook นับจำนวน "ห้องที่กำลังเล่นอยู่" ทั่วโลก ผ่าน global presence channel
// แต่ละ client ที่อยู่ใน room → broadcast room code เป็น meta
// → distinct count ของ room codes = จำนวนห้อง active
export function useGlobalPresence(myRoomCode: string | null): {
  activeRooms: number
} {
  const [activeRooms, setActiveRooms] = useState(0)

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return

    const channel = sb.channel('lobby:global', {
      config: {
        presence: { key: crypto.randomUUID() },
      },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ roomCode: string | null }>()
      // collect distinct room codes (skip null = ไม่อยู่ใน room)
      const codes = new Set<string>()
      for (const metas of Object.values(state)) {
        const meta = metas[0]
        if (meta?.roomCode) codes.add(meta.roomCode)
      }
      setActiveRooms(codes.size)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ roomCode: myRoomCode })
      }
    })

    return () => {
      channel.unsubscribe()
    }
  }, [myRoomCode])

  return { activeRooms }
}
