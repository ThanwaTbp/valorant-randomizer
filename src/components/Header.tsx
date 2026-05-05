'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useGlobalPresence } from '@/lib/useGlobalPresence'
import { Radio } from 'lucide-react'

export function Header() {
  const roomCode = useAppStore((s) => s.roomCode)
  const { activeRooms } = useGlobalPresence(roomCode)

  return (
    <header className='relative z-10 pt-8 pb-4'>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className='flex items-center justify-between gap-3'
      >
        <div className='flex items-center gap-3'>
          {/* logo block */}
          <div className='relative'>
            <div className='w-2 h-12 bg-val-red' />
            <div className='absolute top-0 left-3 w-1 h-8 bg-val-red/60' />
          </div>

          <div>
            <h1 className='font-bebas text-4xl md:text-5xl tracking-[0.15em] leading-none text-val-light'>
              VALORANT <span className='text-val-red'>RANDOMIZER</span>
            </h1>
            <p className='font-rajdhani text-sm tracking-[0.3em] text-val-light/50 mt-1 uppercase'>
              สุ่มตัวละคร · ครบทีม · พร้อมเพื่อน
            </p>
          </div>
        </div>

        {/* live active rooms counter */}
        <ActiveRoomsCounter count={activeRooms} />
      </motion.div>
    </header>
  )
}

function ActiveRoomsCounter({ count }: { count: number }) {
  // ซ่อนถ้ายังไม่มี data (count = 0 อาจหมาย realtime ไม่เชื่อม)
  if (count === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className='hidden sm:flex items-center gap-2 px-3 py-2 bg-val-darker/60 border border-val-red/30 clip-val-sm'
    >
      <motion.div
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Radio className='w-4 h-4 text-val-red' />
      </motion.div>
      <div className='flex flex-col leading-tight'>
        <span className='font-bebas text-lg tracking-widest text-val-light'>
          {count}
        </span>
        <span className='font-bebas text-[10px] tracking-widest text-val-light/50'>
          ห้องกำลังเล่น
        </span>
      </div>
    </motion.div>
  )
}
