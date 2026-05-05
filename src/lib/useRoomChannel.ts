'use client'

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from './supabase'
import { useAppStore } from './store'
import type {
  BanListPayload,
  ModeSyncPayload,
  Player,
  RandomizePayload,
  SoloResetPayload,
  SoloRollPayload,
} from './types'

const EVT_RANDOMIZE = 'randomize'
const EVT_BAN_SYNC = 'ban_sync'
const EVT_MODE_SYNC = 'mode_sync'
const EVT_SOLO_ROLL = 'solo_roll'
const EVT_SOLO_RESET = 'solo_reset'

export function useRoomChannel(roomCode: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  const isHost = useAppStore((s) => s.isHost)
  const playerId = useAppStore((s) => s.playerId)
  const playerName = useAppStore((s) => s.playerName)
  const bannedUuids = useAppStore((s) => s.bannedUuids)
  const mode = useAppStore((s) => s.mode)

  const setMemberCount = useAppStore((s) => s.setMemberCount)
  const setPlayers = useAppStore((s) => s.setPlayers)
  const setBansFromHost = useAppStore((s) => s.setBansFromHost)
  const setMode = useAppStore((s) => s.setMode)
  const applyRandomize = useAppStore((s) => s.applyRandomize)
  const applySoloRoll = useAppStore((s) => s.applySoloRoll)
  const resetSoloRolls = useAppStore((s) => s.resetSoloRolls)

  useEffect(() => {
    if (!roomCode || !playerId) return
    const sb = getSupabase()
    if (!sb) return

    const channel = sb.channel(`room:${roomCode}`, {
      config: {
        broadcast: { self: false },
        // ใช้ playerId เป็น presence key เพื่อ track ตามคน
        presence: { key: playerId },
      },
    })

    // ===== broadcasts =====

    channel.on('broadcast', { event: EVT_RANDOMIZE }, ({ payload }) => {
      applyRandomize(payload as RandomizePayload, false)
    })

    channel.on('broadcast', { event: EVT_BAN_SYNC }, ({ payload }) => {
      setBansFromHost((payload as BanListPayload).bannedUuids)
    })

    channel.on('broadcast', { event: EVT_MODE_SYNC }, ({ payload }) => {
      setMode((payload as ModeSyncPayload).mode)
    })

    channel.on('broadcast', { event: EVT_SOLO_ROLL }, ({ payload }) => {
      applySoloRoll(payload as SoloRollPayload)
    })

    channel.on('broadcast', { event: EVT_SOLO_RESET }, () => {
      resetSoloRolls()
    })

    // ===== presence =====

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{
        name: string
        joinedAt: number
        playerId: string
      }>()
      // state คือ object: key = presenceKey (=playerId), value = array of meta
      const players: Player[] = Object.entries(state).map(([key, metas]) => {
        const meta = metas[0]
        return {
          id: key,
          name: meta?.name ?? 'Anonymous',
          joinedAt: meta?.joinedAt ?? Date.now(),
        }
      })
      setPlayers(players)
      setMemberCount(players.length)

      // host: ส่ง state ปัจจุบันให้คนที่เพิ่ง join (ban + mode)
      if (useAppStore.getState().isHost) {
        const cur = useAppStore.getState()
        channel.send({
          type: 'broadcast',
          event: EVT_BAN_SYNC,
          payload: { bannedUuids: cur.bannedUuids } as BanListPayload,
        })
        channel.send({
          type: 'broadcast',
          event: EVT_MODE_SYNC,
          payload: { mode: cur.mode } as ModeSyncPayload,
        })
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          name: playerName || 'Anonymous',
          joinedAt: Date.now(),
          playerId,
        })
      }
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, playerId])

  // host: ban list เปลี่ยน → broadcast
  useEffect(() => {
    if (!roomCode || !isHost) return
    const ch = channelRef.current
    if (!ch) return
    ch.send({
      type: 'broadcast',
      event: EVT_BAN_SYNC,
      payload: { bannedUuids } as BanListPayload,
    })
  }, [bannedUuids, roomCode, isHost])

  // host: mode เปลี่ยน → broadcast
  useEffect(() => {
    if (!roomCode || !isHost) return
    const ch = channelRef.current
    if (!ch) return
    ch.send({
      type: 'broadcast',
      event: EVT_MODE_SYNC,
      payload: { mode } as ModeSyncPayload,
    })
  }, [mode, roomCode, isHost])

  async function broadcastRandomize(payload: RandomizePayload) {
    const ch = channelRef.current
    if (!ch) return
    await ch.send({
      type: 'broadcast',
      event: EVT_RANDOMIZE,
      payload,
    })
  }

  async function broadcastSoloRoll(payload: SoloRollPayload) {
    const ch = channelRef.current
    if (!ch) return
    await ch.send({
      type: 'broadcast',
      event: EVT_SOLO_ROLL,
      payload,
    })
  }

  async function broadcastSoloReset() {
    const ch = channelRef.current
    if (!ch) return
    await ch.send({
      type: 'broadcast',
      event: EVT_SOLO_RESET,
      payload: { resetAt: Date.now() } as SoloResetPayload,
    })
  }

  return { broadcastRandomize, broadcastSoloRoll, broadcastSoloReset }
}
