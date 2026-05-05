'use client'

import { useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useRoomChannel } from '@/lib/useRoomChannel'
import {
  pickAgents,
  newSeed,
  filterByBans,
  shouldUseFullTeam,
  canMakeFullTeam,
} from '@/lib/randomizer'
import type { RandomizePayload } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { AgentCard, AgentCardSkeleton } from '@/components/AgentCard'
import { SlotReel } from '@/components/SlotReel'
import { Dice5, RotateCcw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { playSpinSfx, playRevealSfx } from '@/lib/audio'

export function Randomizer() {
  const roomCode = useAppStore((s) => s.roomCode)
  const playerName = useAppStore((s) => s.playerName)
  const players = useAppStore((s) => s.players)
  const agents = useAppStore((s) => s.agents)
  const bannedUuids = useAppStore((s) => s.bannedUuids)
  const count = useAppStore((s) => s.count)
  const phase = useAppStore((s) => s.phase)
  const result = useAppStore((s) => s.result)
  const lastPayload = useAppStore((s) => s.lastPayload)

  const setCount = useAppStore((s) => s.setCount)
  const applyRandomize = useAppStore((s) => s.applyRandomize)
  const reset = useAppStore((s) => s.reset)

  const { broadcastRandomize } = useRoomChannel(roomCode)

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

  // auto detect ว่าจะ fullTeam ได้ไหม (N=4 หรือ 5 + pool ครบ 4 role)
  const willUseFullTeam = useMemo(
    () => shouldUseFullTeam(pool, count),
    [pool, count],
  )

  const validation = useMemo(() => {
    if (pool.length < count) {
      return {
        ok: false,
        reason: `เหลือ agent แค่ ${pool.length} ตัว ไม่พอสุ่ม ${count} ตัว`,
      }
    }
    // ถ้า count = 4 หรือ 5 → เช็คว่ามี 4 role ครบไหม (auto fullTeam)
    if (count >= 4) {
      const ft = canMakeFullTeam(pool)
      if (!ft.ok && ft.missingRoles.length > 0) {
        return {
          ok: false,
          reason: `โหมดครบทีม (auto) ขาด: ${ft.missingRoles.join(', ')}`,
        }
      }
    }
    return { ok: true, reason: '' }
  }, [pool, count])

  useEffect(() => {
    if (phase === 'done') reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, bannedUuids])

  async function handleRandomize() {
    if (!validation.ok || pool.length === 0 || phase === 'rolling') return

    const seed = newSeed()
    const picked = pickAgents(pool, count, seed)

    // SNAPSHOT players ตอนนี้ — กัน mapping เพี้ยนถ้ามีคนเข้า/ออกระหว่าง rolling
    // ถ้าไม่อยู่ใน room → ใช้ชื่อตัวเอง
    const snapshotNames =
      players.length > 0
        ? players.slice(0, count).map((p) => p.name)
        : [playerName || 'You']

    const payload: RandomizePayload = {
      roundId:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      seed,
      count,
      agentUuids: picked.map((a) => a.uuid),
      fullTeam: willUseFullTeam,
      startedAt: Date.now(),
      playerNames: snapshotNames,
    }

    const accepted = applyRandomize(payload, true)
    if (accepted) {
      playSpinSfx()
    }
    if (roomCode && accepted) {
      await broadcastRandomize(payload)
    }
  }

  const displayUuids = lastPayload?.agentUuids ?? []
  const displayCount = lastPayload?.count ?? count

  // ใช้ snapshot จาก payload — กันเพี้ยน
  function nameFor(index: number): string | null {
    if (lastPayload?.playerNames) {
      return lastPayload.playerNames[index] ?? null
    }
    // fallback ตอน idle (ยังไม่มี payload)
    if (players.length > 0) return players[index]?.name ?? null
    return index === 0 ? playerName || 'You' : null
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
          {/* แสดง info auto fullTeam */}
          {count >= 4 && willUseFullTeam && (
            <p className='text-xs text-val-mint mt-2 font-bebas tracking-widest'>
              ✓ AUTO: ครบ 4 ROLE {count === 5 && '+ FLEX'}
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

      {/* DISPLAY (idle + done — rolling จะแสดงใน RollModal) */}
      <div className='min-h-[420px]'>
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
            // Modal overlay จะ render reels — ที่นี่แสดง placeholder
            <motion.div
              key={'rolling-placeholder-' + lastPayload.roundId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              className={cn('grid gap-4', gridCols(displayCount))}
            >
              {displayUuids.map((uuid, i) => (
                <div key={uuid + '-' + i} className='space-y-2'>
                  <PlayerLabel name={nameFor(i)} />
                  <AgentCardSkeleton index={i} />
                </div>
              ))}
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

      {/* MODAL OVERLAY ตอน rolling */}
      <RollModal pool={pool} gridCols={gridCols} nameFor={nameFor} />
    </section>
  )
}

// modal กลางจอตอน rolling
function RollModal({
  pool,
  gridCols,
  nameFor,
}: {
  pool: { uuid: string }[]
  gridCols: (n: number) => string
  nameFor: (i: number) => string | null
}) {
  const phase = useAppStore((s) => s.phase)
  const lastPayload = useAppStore((s) => s.lastPayload)
  const agents = useAppStore((s) => s.agents)

  return (
    <AnimatePresence>
      {phase === 'rolling' && lastPayload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 z-30 flex items-center justify-center p-4 bg-val-darker/90 backdrop-blur-sm'
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className='w-full max-w-5xl space-y-6'
          >
            <div className='text-center'>
              <div className='font-bebas text-3xl tracking-[0.4em] text-val-red animate-pulse'>
                ROLLING
              </div>
              <div className='h-0.5 w-24 bg-val-red mx-auto mt-2' />
            </div>

            <div className={cn('grid gap-4', gridCols(lastPayload.count))}>
              {lastPayload.agentUuids.map((uuid, i) => {
                const finalAgent = agents.find((a) => a.uuid === uuid)
                if (!finalAgent) return null
                return (
                  <div
                    key={uuid + '-' + lastPayload.roundId}
                    className='space-y-2'
                  >
                    <PlayerLabel name={nameFor(i)} />
                    <SlotReel
                      pool={pool as never}
                      finalAgent={finalAgent}
                      delay={i * 200}
                      duration={1500 + i * 100}
                    />
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
