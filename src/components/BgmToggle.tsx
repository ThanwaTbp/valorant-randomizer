'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  tryPlayBgm,
  pauseBgm,
  setBgmEnabled,
  setBgmVolume,
} from '@/lib/audio'
import { Music, Music2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// default = ปิด — user ต้องกดปุ่มเองเพื่อเปิด
export function BgmToggle() {
  const [playing, setPlaying] = useState(false)
  // const [volume, setVol] = useState(0.3)
  // const [showVolume, setShowVolume] = useState(false)

  async function handleToggle() {
    if (playing) {
      pauseBgm()
      setBgmEnabled(false)
      setPlaying(false)
    } else {
      setBgmEnabled(true)
      const ok = await tryPlayBgm()
      setPlaying(ok)
    }
  }

  // function handleVolumeChange(v: number) {
  //   setVol(v)
  //   setBgmVolume(v)
  // }

  return (
    <div className='fixed sm:top-4 top-[unset] sm:bottom-[unset] bottom-4 right-4 z-40 flex items-start gap-2'>
      {/* <AnimatePresence>
        {showVolume && playing && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className='flex items-center gap-2 px-3 py-2 bg-val-darker/90 border border-val-light/10 clip-val-sm'
          >
            <input
              type='range'
              min='0'
              max='1'
              step='0.05'
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className='w-24 accent-val-red'
            />
            <span className='font-bebas text-xs text-val-light/60 tracking-widest min-w-[2ch] text-right'>
              {Math.round(volume * 100)}
            </span>
          </motion.div>
        )}
      </AnimatePresence> */}

      <button
        onClick={handleToggle}
        className={cn(
          'p-3 transition-all clip-val-sm border-2',
          playing
            ? 'bg-val-red/20 border-val-red text-val-red shadow-[0_0_20px_rgba(255,70,85,0.4)]'
            : 'bg-val-darker/80 border-val-light/20 text-val-light/60 hover:border-val-red/60',
        )}
        aria-label={playing ? 'pause music' : 'play music'}
      >
        {playing ? (
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          >
            <Music2 className='w-5 h-5' />
          </motion.div>
        ) : (
          <Music className='w-5 h-5' />
        )}
      </button>
    </div>
  )
}