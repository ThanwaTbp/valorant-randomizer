'use client'

import { motion } from 'framer-motion'

export function Header() {
  return (
    <header className='relative z-10 pt-8 pb-4'>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className='flex items-center gap-3'
      >
        {/* logo block แบบ valorant */}
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
      </motion.div>
    </header>
  )
}
