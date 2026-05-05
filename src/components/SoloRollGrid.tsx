'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useRoomChannel } from '@/lib/useRoomChannel'
import {
  filterByBans,
  filterByClaimed,
  newSeed,
  pickSoloAgent,
} from '@/lib/randomizer'
import type { Agent, SoloRollPayload } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { SlotReel } from '@/components/SlotReel'
import { Dice5, RotateCcw, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { playSpinSfx, playRevealSfx } from '@/lib/audio'
import { useScrollTo } from '@/lib/useScrollTo'

export function SoloRollGrid() {
  const roomCode = useAppStore((s) => s.roomCode)
  const isHost = useAppStore((s) => s.isHost)
  const playerId = useAppStore((s) => s.playerId)
  const playerName = useAppStore((s) => s.playerName)
  const players = useAppStore((s) => s.players)
  const agents = useAppStore((s) => s.agents)
  const bannedUuids = useAppStore((s) => s.bannedUuids)
  const soloResults = useAppStore((s) => s.soloResults)

  const applySoloRoll = useAppStore((s) => s.applySoloRoll)
  const resetSoloRolls = useAppStore((s) => s.resetSoloRolls)

  const { broadcastSoloRoll, broadcastSoloReset } = useRoomChannel(roomCode)

  // ref สำหรับ scroll ไป grid ตอนกดสุ่ม
  const { ref: gridRef, scrollTo } = useScrollTo()

  // เล่น reveal SFX ตอน solo result ของตัวเองเปลี่ยน done = true
  const myResult = playerId ? soloResults[playerId] : undefined
  const prevDone = useRef(myResult?.done ?? false)
  useEffect(() => {
    const cur = myResult?.done ?? false
    if (!prevDone.current && cur) {
      playRevealSfx()
    }
    prevDone.current = cur
  }, [myResult?.done])

  // ถ้าไม่อยู่ใน room → standalone (เห็นตัวเองคนเดียว)
  const displayPlayers =
    players.length > 0
      ? players
      : playerId
        ? [
            {
              id: playerId,
              name: playerName || 'You',
              joinedAt: Date.now(),
            },
          ]
        : []

  // pool หลังตัด ban
  const banFiltered = filterByBans(agents, bannedUuids)
  // pool หลังตัด ban + ตัวที่คนอื่น claim แล้ว
  const claimedUuids = Object.values(soloResults).map((r) => r.agentUuid)

  // ถ้าตัวเองยังไม่ได้สุ่ม → pool คือ ban filtered ลบ claimed ของคนอื่น
  const myPool = filterByClaimed(
    banFiltered,
    claimedUuids.filter((u) => u !== myResult?.agentUuid),
  )

  const canRoll = playerId && !myResult && myPool.length > 0
  const noPool = playerId && !myResult && myPool.length === 0

  async function handleRoll() {
    if (!canRoll || !playerId) return

    const seed = newSeed()
    const picked = pickSoloAgent(myPool, seed)
    if (!picked) return

    const payload: SoloRollPayload = {
      playerId,
      agentUuid: picked.uuid,
      roundId:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      startedAt: Date.now(),
    }

    const ok = applySoloRoll(payload)
    if (!ok) return

    // SFX + scroll ทันที
    playSpinSfx()
    scrollTo()

    if (roomCode) {
      await broadcastSoloRoll(payload)
    }
  }

  function handleResetAll() {
    resetSoloRolls()
    if (roomCode && isHost) {
      broadcastSoloReset()
    }
  }

  // grid สำหรับจำนวนคน
  const gridCols = (n: number) => {
    if (n === 1) return 'grid-cols-1 max-w-xs mx-auto'
    if (n === 2) return 'grid-cols-2 max-w-2xl mx-auto'
    if (n === 3) return 'grid-cols-2 sm:grid-cols-3 max-w-4xl mx-auto'
    if (n === 4) return 'grid-cols-2 sm:grid-cols-4 max-w-5xl mx-auto'
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
  }

  return (
    <section className='space-y-6'>
      {/* control */}
      <div className='p-6 bg-val-darker/60 border border-val-light/10 clip-val-sm space-y-4'>
        <div className='font-bebas text-sm tracking-[0.3em] text-val-light/60'>
          SOLO MODE · กดสุ่มของตัวเอง 1 ตัว · ห้ามซ้ำ
        </div>

        {noPool && (
          <div className='flex items-start gap-3 p-3 bg-val-red/15 border border-val-red/50'>
            <AlertTriangle className='w-5 h-5 text-val-red flex-shrink-0 mt-0.5' />
            <div className='text-sm text-val-light/80'>
              agent หมดแล้ว · ลองให้ host ปลด ban หรือ reset
            </div>
          </div>
        )}

        <div className='flex gap-3'>
          <Button
            size='lg'
            onClick={handleRoll}
            disabled={!canRoll}
            className='flex-1'
          >
            <Dice5 className='w-5 h-5 mr-3' />
            {myResult
              ? myResult.done
                ? `ได้ ${agents.find((a) => a.uuid === myResult.agentUuid)?.name ?? '?'}`
                : 'กำลังสุ่ม...'
              : noPool
                ? 'agent หมด'
                : 'สุ่มของฉัน!'}
          </Button>
          {(isHost || !roomCode) && Object.keys(soloResults).length > 0 && (
            <Button variant='ghost' onClick={handleResetAll}>
              <RotateCcw className='w-4 h-4 mr-2' /> RESET ทุกคน
            </Button>
          )}
        </div>

        {!isHost && roomCode && Object.keys(soloResults).length > 0 && (
          <p className='text-xs text-val-light/40'>
            * เฉพาะ HOST reset ได้
          </p>
        )}

        <div className='text-xs text-val-light/40 text-center font-bebas tracking-widest'>
          POOL: {banFiltered.length - claimedUuids.length} / {banFiltered.length}
          <span className='text-val-red ml-2'>· {claimedUuids.length} CLAIMED</span>
        </div>
      </div>

      {/* grid ของแต่ละคน */}
      {displayPlayers.length === 0 ? (
        <div className='text-center text-val-light/40 py-12'>
          ยังไม่มีคนใน room
        </div>
      ) : (
        <div ref={gridRef} className={cn('grid gap-4 scroll-mt-4', gridCols(displayPlayers.length))}>
          {displayPlayers.map((player) => {
            const result = soloResults[player.id]
            const agent = result
              ? agents.find((a) => a.uuid === result.agentUuid)
              : null
            const isMe = player.id === playerId

            return (
              <PlayerSlot
                key={player.id}
                playerName={player.name}
                isMe={isMe}
                agent={agent ?? null}
                rolling={result ? !result.done : false}
                pool={banFiltered}
                roundId={result?.roundId}
              />
            )
          })}
        </div>
      )}

      {/* OVERLAY ตอน rolling/done — โชว์เฉพาะของตัวเอง */}
      <SoloRollModal pool={banFiltered} resultRef={gridRef} />
    </section>
  )
}

// modal กลางจอ — แสดงผล solo roll ของตัวเอง
function SoloRollModal({
  pool,
  resultRef,
}: {
  pool: Agent[]
  resultRef: React.RefObject<HTMLDivElement | null>
}) {
  const playerId = useAppStore((s) => s.playerId)
  const playerName = useAppStore((s) => s.playerName)
  const agents = useAppStore((s) => s.agents)
  const soloResults = useAppStore((s) => s.soloResults)
  const overlayClosed = useAppStore((s) => s.overlayClosed)
  const setOverlayClosed = useAppStore((s) => s.setOverlayClosed)

  const myResult = playerId ? soloResults[playerId] : undefined
  const myAgent = myResult
    ? agents.find((a) => a.uuid === myResult.agentUuid)
    : null
  const isOpen = !!myResult && !overlayClosed
  const isDone = myResult?.done ?? false

  function handleClose() {
    setOverlayClosed(true)
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  useEffect(() => {
    if (!isOpen || !isDone) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isDone])

  return (
    <AnimatePresence>
      {isOpen && myAgent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 z-30 flex items-center justify-center p-4 bg-val-darker/90 backdrop-blur-sm overflow-y-auto'
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className='w-full max-w-md space-y-6 my-auto'
          >
            <div className='flex items-center justify-between'>
              <div className='flex-1' />
              <div className='text-center flex-1'>
                <div
                  className={cn(
                    'font-bebas text-3xl tracking-[0.4em]',
                    isDone ? 'text-val-mint' : 'text-val-red animate-pulse',
                  )}
                >
                  {isDone ? 'YOUR PICK' : 'ROLLING'}
                </div>
                <div
                  className={cn(
                    'h-0.5 w-24 mx-auto mt-2',
                    isDone ? 'bg-val-mint' : 'bg-val-red',
                  )}
                />
              </div>
              <div className='flex-1 flex justify-end'>
                {isDone && (
                  <button
                    onClick={handleClose}
                    className='p-2 bg-val-darker/80 border-2 border-val-light/20 hover:border-val-red hover:text-val-red transition-all clip-val-sm'
                    aria-label='ปิด'
                  >
                    <X className='w-5 h-5' />
                  </button>
                )}
              </div>
            </div>

            <div className='space-y-2'>
              <div className='px-3 py-1.5 bg-val-red text-val-light text-center font-bebas tracking-widest text-sm'>
                {playerName || 'You'}
              </div>
              {isDone ? (
                <SoloDoneCard agent={myAgent} />
              ) : (
                <SlotReel
                  pool={pool}
                  finalAgent={myAgent}
                  delay={0}
                  duration={1800}
                />
              )}
            </div>

            {isDone && (
              <div className='flex justify-center pt-2'>
                <Button onClick={handleClose} size='lg'>
                  <X className='w-5 h-5 mr-2' /> ปิด · ดูผลด้านล่าง
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface PlayerSlotProps {
  playerName: string
  isMe: boolean
  agent: Agent | null
  rolling: boolean
  pool: Agent[]
  roundId?: string
}

function PlayerSlot({
  playerName,
  isMe,
  agent,
  rolling,
  pool,
  roundId,
}: PlayerSlotProps) {
  return (
    <div className='space-y-2'>
      {/* ชื่อ player */}
      <div
        className={cn(
          'px-3 py-1.5 font-bebas tracking-widest text-sm truncate text-center',
          isMe
            ? 'bg-val-red text-val-light shadow-[0_0_10px_rgba(255,70,85,0.5)]'
            : 'bg-val-accent/60 text-val-light/80',
        )}
      >
        {playerName} {isMe && '· YOU'}
      </div>

      <AnimatePresence mode='wait'>
        {rolling && agent && roundId ? (
          <motion.div
            key={'rolling-' + roundId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SlotReel pool={pool} finalAgent={agent} delay={0} duration={1800} />
          </motion.div>
        ) : agent ? (
          <SoloDoneCard key='done' agent={agent} />
        ) : (
          <EmptySlot key='empty' />
        )}
      </AnimatePresence>
    </div>
  )
}

function SoloDoneCard({ agent }: { agent: Agent }) {
  const gradient =
    agent.bgColors.length >= 2
      ? `linear-gradient(180deg, #${agent.bgColors[0].slice(0, 6)} 0%, #${agent.bgColors[2]?.slice(0, 6) ?? agent.bgColors[1].slice(0, 6)} 100%)`
      : 'linear-gradient(180deg, #1f2731 0%, #0a141f 100%)'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className='relative aspect-[3/4] overflow-hidden clip-val border-2 border-val-red shadow-[0_0_20px_rgba(255,70,85,0.4)]'
      style={{ background: gradient }}
    >
      {agent.portrait ? (
        <Image
          src={agent.portrait}
          alt={agent.name}
          fill
          sizes='(max-width: 768px) 50vw, 20vw'
          className='object-cover object-top'
          unoptimized
        />
      ) : (
        <div className='absolute inset-0 flex items-center justify-center'>
          <Image src={agent.icon} alt={agent.name} width={120} height={120} unoptimized />
        </div>
      )}
      <div className='absolute inset-0 bg-gradient-to-t from-val-darker via-transparent to-transparent' />
      <div className='absolute bottom-0 left-0 right-0 p-3'>
        <h3 className='font-bebas text-2xl tracking-wider text-val-light leading-none'>
          {agent.name}
        </h3>
        <div className='h-0.5 w-10 bg-val-red mt-2' />
      </div>
    </motion.div>
  )
}

function EmptySlot() {
  return (
    <div className='aspect-[3/4] clip-val border-2 border-dashed border-val-light/20 bg-val-accent/20 flex items-center justify-center'>
      <span className='font-bebas text-3xl text-val-light/30 tracking-widest'>
        ยังไม่ได้สุ่ม
      </span>
    </div>
  )
}
