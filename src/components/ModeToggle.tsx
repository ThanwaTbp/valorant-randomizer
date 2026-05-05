'use client'

import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { GameMode } from '@/lib/types'
import { Users, User } from 'lucide-react'

export function ModeToggle() {
  const mode = useAppStore((s) => s.mode)
  const isHost = useAppStore((s) => s.isHost)
  const roomCode = useAppStore((s) => s.roomCode)
  const setMode = useAppStore((s) => s.setMode)
  const reset = useAppStore((s) => s.reset)

  // standalone (ไม่อยู่ใน room) → ตัวเองเลือกได้
  // ใน room → host เลือกได้คนเดียว
  const canEdit = !roomCode || isHost

  function handleSwitch(m: GameMode) {
    if (!canEdit) return
    if (m === mode) return
    setMode(m)
    reset()
  }

  const options: { value: GameMode; label: string; desc: string; icon: typeof Users }[] = [
    {
      value: 'team',
      label: 'TEAM ROLL',
      desc: 'สุ่มทีมพร้อมกัน · ใครก็กดได้',
      icon: Users,
    },
    {
      value: 'solo',
      label: 'SOLO ROLL',
      desc: 'แต่ละคนสุ่มเอง · ห้ามซ้ำ',
      icon: User,
    },
  ]

  return (
    <div className='p-4 bg-val-darker/60 border border-val-light/10 clip-val-sm'>
      <div className='font-bebas text-sm tracking-[0.3em] text-val-light/60 mb-3 px-1'>
        โหมด {!canEdit && <span className='text-val-light/40'>(HOST คุม)</span>}
      </div>
      <div className='grid grid-cols-2 gap-2'>
        {options.map((opt) => {
          const Icon = opt.icon
          const active = mode === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSwitch(opt.value)}
              disabled={!canEdit}
              className={cn(
                'p-3 text-left transition-all clip-val-sm border-2',
                active
                  ? 'bg-val-red/20 border-val-red text-val-light shadow-[0_0_20px_rgba(255,70,85,0.4)]'
                  : 'bg-val-accent/30 border-val-light/10 text-val-light/60 hover:bg-val-accent/60',
                !canEdit && 'cursor-not-allowed opacity-60',
              )}
            >
              <div className='flex items-center gap-2 mb-1'>
                <Icon className='w-4 h-4' />
                <span className='font-bebas text-lg tracking-widest'>
                  {opt.label}
                </span>
              </div>
              <p className='text-xs text-val-light/50'>{opt.desc}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
