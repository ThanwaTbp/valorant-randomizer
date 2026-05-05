'use client'

import { useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useRoomChannel } from '@/lib/useRoomChannel'
import {
  pickAgents,
  newSeed,
  filterByBans,
  canMakeFullTeam,
} from '@/lib/randomizer'
import type { Agent, RandomizePayload } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Input'
import { AgentCard, AgentCardSkeleton } from '@/components/AgentCard'
import { SlotReel } from '@/components/SlotReel'
import { Dice5, RotateCcw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { playSpinSfx, playRevealSfx } from '@/lib/audio'
import { useScrollTo } from '@/lib/useScrollTo'

export function Randomizer() {
  const roomCode = useAppStore((s) => s.roomCode)
  const playerName = useAppStore((s) => s.playerName)
  const players = useAppStore((s) => s.players)
  const agents = useAppStore((s) => s.agents)
  const bannedUuids = useAppStore((s) => s.bannedUuids)
  const count = useAppStore((s) => s.count)
  const fullTeam = useAppStore((s) => s.fullTeam)
  const phase = useAppStore((s) => s.phase)
  const result = useAppStore((s) => s.result)
  const lastPayload = useAppStore((s) => s.lastPayload)

  const setCount = useAppStore((s) => s.setCount)
  const setFullTeam = useAppStore((s) => s.setFullTeam)
  const applyRandomize = useAppStore((s) => s.applyRandomize)
  const reset = useAppStore((s) => s.reset)

  const { broadcastRandomize } = useRoomChannel(roomCode)

  // ref สำหรับ scroll ไปที่ display area ตอน rolling
  const { ref: displayRef, scrollTo } = useScrollTo()

  // เล่น reveal SFX ตอน phase เปลี่ยน rolling → done
  const prevPhase = useRef(phase)
  useEffect(() => {
    if (prevPhase.current === 'rolling' && phase === 'done') {
      playRevealSfx()
    }
    prevPhase.current = phase
  }, [phase])

  // pool หลังตัด ban
  const pool = useMemo(
    () => filterByBans(agents, bannedUuids),
    [agents, bannedUuids],
  )

  const validation = useMemo(() => {
    if (pool.length < count) {
      return {
        ok: false,
        reason: `เหลือ agent แค่ ${pool.length} ตัว ไม่พอสุ่ม ${count} ตัว`,
      }
    }
    if (fullTeam && count === 5) {
      const ft = canMakeFullTeam(pool)
      if (!ft.ok) {
        return {
          ok: false,
          reason: `โหมดครบทีมต้องมีครบ 4 role · ขาด: ${ft.missingRoles.join(', ')}`,
        }
      }
    }
    return { ok: true, reason: '' }
  }, [pool, count, fullTeam])

  useEffect(() => {
    if (phase === 'done') reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, fullTeam, bannedUuids])

  async function handleRandomize() {
    if (!validation.ok || pool.length === 0 || phase === 'rolling') return

    const seed = newSeed()
    const useFullTeam = fullTeam && count === 5
    const picked = pickAgents(pool, count, seed, useFullTeam)

    const payload: RandomizePayload = {
      roundId:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      seed,
      count,
      agentUuids: picked.map((a) => a.uuid),
      fullTeam: useFullTeam,
      startedAt: Date.now(),
    }

    const accepted = applyRandomize(payload, true)
    if (accepted) {
      // SFX + scroll ทันที
      playSpinSfx()
      scrollTo()
    }
    if (roomCode && accepted) {
      await broadcastRandomize(payload)
    }
  }

  const displayUuids = lastPayload?.agentUuids ?? []
  const displayCount = lastPayload?.count ?? count

  // mapping ตัว→ชื่อ ตาม index ใน players (เรียง joinedAt asc แล้วใน store)
  // ถ้าไม่อยู่ใน room → ใช้ชื่อตัวเองเป็นคนแรก
  const playerNamesForMapping: string[] = useMemo(() => {
    if (players.length > 0) return players.map((p) => p.name)
    return [playerName || 'You']
  }, [players, playerName])

  function nameFor(index: number): string | null {
    return playerNamesForMapping[index] ?? null
  }

  const gridCols = (n: number) => {
    if (n === 1) return 'grid-cols-1 max-w-xs mx-auto'
    if (n === 2) return 'grid-cols-2 max-w-2xl mx-auto'
    if (n === 3) return 'grid-cols-2 sm:grid-cols-3 max-w-4xl mx-auto'
    if (n === 4) return 'grid-cols-2 sm:grid-cols-4 max-w-5xl mx-auto'
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
  }

  return (
    <section className='space-y-8'>
      {/* CONTROLS */}
      <div className='p-6 bg-val-darker/60 border border-val-light/10 clip-val-sm space-y-6'>
        <div>
          <div className='font-bebas text-sm tracking-[0.3em] text-val-light/60 mb-3'>
            จำนวนตัวละคร
          </div>
          <div className='flex flex-wrap gap-2'>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                disabled={phase === 'rolling'}
                className={cn(
                  'w-14 h-14 font-bebas text-2xl transition-all clip-val-sm',
                  count === n
                    ? 'bg-val-red text-val-light shadow-[0_0_20px_rgba(255,70,85,0.6)]'
                    : 'bg-val-accent/40 text-val-light/60 hover:bg-val-accent/70',
                  phase === 'rolling' && 'opacity-40 cursor-not-allowed',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Toggle
            checked={fullTeam}
            onChange={setFullTeam}
            label='ครบทีม (4 ROLE + 1 FLEX)'
            disabled={count !== 5 || phase === 'rolling'}
          />
          {count !== 5 && (
            <p className='text-xs text-val-light/40 mt-2'>
              * โหมดครบทีมใช้ได้เมื่อสุ่ม 5 ตัวเท่านั้น
            </p>
          )}
        </div>

        {!validation.ok && (
          <div className='flex items-start gap-3 p-3 bg-val-red/15 border border-val-red/50'>
            <AlertTriangle className='w-5 h-5 text-val-red flex-shrink-0 mt-0.5' />
            <div className='text-sm'>
              <div className='font-bebas tracking-widest text-val-red'>
                สุ่มไม่ได้
              </div>
              <p className='text-val-light/80 mt-1'>{validation.reason}</p>
            </div>
          </div>
        )}

        {roomCode && phase === 'idle' && validation.ok && (
          <div className='text-xs text-val-light/50 text-center font-bebas tracking-widest'>
            ใครก็กดได้ · ถ้ากดพร้อมกัน คนที่กดก่อนชนะ
          </div>
        )}

        <div className='flex gap-3'>
          <Button
            size='lg'
            onClick={handleRandomize}
            disabled={
              phase === 'rolling' || pool.length === 0 || !validation.ok
            }
            className='flex-1'
          >
            <Dice5 className='w-5 h-5 mr-3' />
            {phase === 'rolling'
              ? 'กำลังสุ่ม...'
              : phase === 'done'
                ? 'สุ่มอีกครั้ง'
                : 'สุ่ม!'}
          </Button>
          {phase === 'done' && (
            <Button variant='ghost' onClick={reset}>
              <RotateCcw className='w-4 h-4 mr-2' /> RESET
            </Button>
          )}
        </div>

        <div className='text-xs text-val-light/40 text-center font-bebas tracking-widest'>
          POOL: {pool.length} / {agents.length}
          {bannedUuids.length > 0 && (
            <span className='text-val-red ml-2'>
              ({bannedUuids.length} BANNED)
            </span>
          )}
        </div>
      </div>

      {/* DISPLAY */}
      <div ref={displayRef} className='min-h-[420px] scroll-mt-4'>
        <AnimatePresence mode='wait'>
          {phase === 'idle' && (
            <motion.div
              key='idle'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn('grid gap-4', gridCols(count))}
            >
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className='space-y-2'>
                  <PlayerLabel name={nameFor(i)} />
                  <AgentCardSkeleton index={i} />
                </div>
              ))}
            </motion.div>
          )}

          {phase === 'rolling' && lastPayload && (
            <motion.div
              key={'rolling-' + lastPayload.roundId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn('grid gap-4', gridCols(displayCount))}
            >
              {displayUuids.map((uuid, i) => {
                const finalAgent = agents.find((a) => a.uuid === uuid)
                if (!finalAgent) return null
                return (
                  <div key={uuid + '-' + lastPayload.roundId} className='space-y-2'>
                    <PlayerLabel name={nameFor(i)} />
                    <SlotReel
                      pool={pool}
                      finalAgent={finalAgent}
                      delay={i * 200}
                      duration={1500 + i * 100}
                    />
                  </div>
                )
              })}
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.div
              key='done'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='space-y-4'
            >
              <div className={cn('grid gap-4', gridCols(result.length))}>
                {result.map((agent, i) => (
                  <div key={agent.uuid} className='space-y-2'>
                    <PlayerLabel name={nameFor(i)} />
                    <AgentCard agent={agent} index={i} />
                  </div>
                ))}
              </div>

              {lastPayload?.fullTeam && <RoleSummary agents={result} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

function PlayerLabel({ name }: { name: string | null }) {
  if (!name) {
    return (
      <div className='px-3 py-1.5 bg-val-accent/40 text-val-light/40 text-center font-bebas tracking-widest text-sm'>
        ไม่มีผู้เล่น
      </div>
    )
  }
  return (
    <div className='px-3 py-1.5 bg-val-accent/60 text-val-light/90 text-center font-bebas tracking-widest text-sm truncate'>
      {name}
    </div>
  )
}

function RoleSummary({ agents }: { agents: { role: string }[] }) {
  const counts = agents.reduce<Record<string, number>>((acc, a) => {
    acc[a.role] = (acc[a.role] ?? 0) + 1
    return acc
  }, {})
  const order = ['Duelist', 'Initiator', 'Controller', 'Sentinel']
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className='flex flex-wrap gap-3 justify-center pt-4'
    >
      {order.map((role) => (
        <div
          key={role}
          className={cn(
            'px-4 py-1.5 font-bebas tracking-widest text-sm',
            counts[role]
              ? 'bg-val-red/80 text-val-light'
              : 'bg-val-accent/40 text-val-light/40',
          )}
        >
          {role} × {counts[role] ?? 0}
        </div>
      ))}
    </motion.div>
  )
}
