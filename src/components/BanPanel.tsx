'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import type { Agent, AgentRole } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Ban, ChevronDown, ChevronUp, X } from 'lucide-react'

const ROLES: AgentRole[] = ['Duelist', 'Initiator', 'Controller', 'Sentinel']

const ROLE_COLOR: Record<AgentRole, string> = {
  Duelist: 'border-red-500/60',
  Initiator: 'border-yellow-500/60',
  Controller: 'border-purple-500/60',
  Sentinel: 'border-emerald-500/60',
}

export function BanPanel() {
  const agents = useAppStore((s) => s.agents)
  const bannedUuids = useAppStore((s) => s.bannedUuids)
  const isHost = useAppStore((s) => s.isHost)
  const roomCode = useAppStore((s) => s.roomCode)
  const toggleBan = useAppStore((s) => s.toggleBan)
  const clearBans = useAppStore((s) => s.clearBans)

  // ถ้าอยู่ใน room → host เท่านั้นที่แก้ได้, viewer ดูอย่างเดียว
  // ถ้าไม่อยู่ใน room → ทำตัวเป็น standalone host แก้ได้
  const canEdit = !roomCode || isHost
  // persist เฉพาะ host (รวมถึง standalone) — viewer ใน room ไม่ persist
  const persist = canEdit

  const [open, setOpen] = useState(false)

  const banSet = new Set(bannedUuids)
  const banCount = bannedUuids.length

  function handleToggle(uuid: string) {
    if (!canEdit) return
    toggleBan(uuid, persist)
  }

  function handleClear() {
    if (!canEdit) return
    clearBans(persist)
  }

  // group agents ตาม role
  const grouped = ROLES.map((role) => ({
    role,
    list: agents.filter((a) => a.role === role),
  }))

  return (
    <div className='bg-val-darker/60 border border-val-light/10 clip-val-sm overflow-hidden'>
      {/* header — กดเปิด/ปิด */}
      <button
        onClick={() => setOpen((v) => !v)}
        className='w-full flex items-center justify-between p-4 hover:bg-val-accent/30 transition-colors'
      >
        <div className='flex items-center gap-3'>
          <Ban className='w-5 h-5 text-val-red' />
          <span className='font-bebas text-xl tracking-widest text-val-light'>
            BAN LIST
          </span>
          {banCount > 0 && (
            <span className='font-bebas text-sm bg-val-red text-val-light px-2 py-0.5 tracking-widest'>
              {banCount} BANNED
            </span>
          )}
          {!canEdit && (
            <span className='font-bebas text-xs bg-val-accent text-val-light/60 px-2 py-0.5 tracking-widest'>
              VIEW ONLY
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className='w-5 h-5 text-val-light/60' />
        ) : (
          <ChevronDown className='w-5 h-5 text-val-light/60' />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className='overflow-hidden'
          >
            <div className='p-4 space-y-4 border-t border-val-light/10'>
              {/* แถวบนสุด: clear button */}
              {canEdit && banCount > 0 && (
                <div className='flex justify-end'>
                  <Button variant='ghost' size='sm' onClick={handleClear}>
                    <X className='w-4 h-4 mr-1' /> CLEAR ALL
                  </Button>
                </div>
              )}

              {!canEdit && (
                <p className='text-xs text-val-light/40'>
                  HOST เป็นคนคุม ban list — viewer ดูอย่างเดียว
                </p>
              )}

              {/* group ตาม role */}
              {grouped.map(({ role, list }) => (
                <div key={role}>
                  <div
                    className={cn(
                      'font-bebas text-sm tracking-[0.3em] mb-2 pl-2 border-l-2',
                      ROLE_COLOR[role],
                    )}
                  >
                    {role.toUpperCase()}
                  </div>
                  <div className='grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2'>
                    {list.map((agent) => (
                      <AgentBanTile
                        key={agent.uuid}
                        agent={agent}
                        banned={banSet.has(agent.uuid)}
                        canEdit={canEdit}
                        onToggle={() => handleToggle(agent.uuid)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface AgentBanTileProps {
  agent: Agent
  banned: boolean
  canEdit: boolean
  onToggle: () => void
}

function AgentBanTile({ agent, banned, canEdit, onToggle }: AgentBanTileProps) {
  return (
    <button
      type='button'
      onClick={onToggle}
      disabled={!canEdit}
      className={cn(
        'relative aspect-square overflow-hidden border-2 transition-all group',
        banned
          ? 'border-val-red bg-val-red/10'
          : 'border-val-light/20 bg-val-accent/30 hover:border-val-light/50',
        !canEdit && 'cursor-not-allowed',
        canEdit && 'cursor-pointer',
      )}
      aria-label={`${banned ? 'unban' : 'ban'} ${agent.name}`}
      aria-pressed={banned}
    >
      <Image
        src={agent.icon}
        alt={agent.name}
        fill
        sizes='80px'
        className={cn(
          'object-contain p-1 transition-all',
          banned && 'grayscale opacity-30',
        )}
        unoptimized
      />

      {/* X overlay เมื่อ ban */}
      {banned && (
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
          <div className='w-full h-1 bg-val-red rotate-45 absolute' />
          <div className='w-full h-1 bg-val-red -rotate-45 absolute' />
        </div>
      )}

      {/* ชื่อ agent ที่ขอบล่าง */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 px-1 py-0.5 text-center',
          'font-bebas text-[10px] tracking-wider truncate',
          banned ? 'bg-val-red text-val-light' : 'bg-val-darker/80 text-val-light/80',
        )}
      >
        {agent.name}
      </div>
    </button>
  )
}
