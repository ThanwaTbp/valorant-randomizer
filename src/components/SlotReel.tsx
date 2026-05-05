'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import type { Agent } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SlotReelProps {
  // pool ของ agent ที่จะหมุนผ่านตา
  pool: Agent[]
  // agent สุดท้ายที่จะหยุด
  finalAgent: Agent
  // delay ก่อนเริ่ม (สำหรับ stagger หลายๆ reel)
  delay?: number
  // ระยะเวลาหมุน (ms)
  duration?: number
  // callback ตอนหยุดหมุน
  onSettled?: () => void
}

export function SlotReel({
  pool,
  finalAgent,
  delay = 0,
  duration = 1800,
  onSettled,
}: SlotReelProps) {
  const [currentAgent, setCurrentAgent] = useState<Agent>(pool[0] ?? finalAgent)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    if (pool.length === 0) {
      setCurrentAgent(finalAgent)
      setSettled(true)
      onSettled?.()
      return
    }

    const startTimer = setTimeout(() => {
      const startTime = Date.now()
      let interval = 60 // ms ต่อ frame เริ่มเร็ว → ค่อยช้าลง

      const tick = () => {
        const elapsed = Date.now() - startTime
        if (elapsed >= duration) {
          setCurrentAgent(finalAgent)
          setSettled(true)
          onSettled?.()
          return
        }
        // สุ่ม agent ในกลางๆ — ตอนใกล้จบให้ค่อยๆ ช้าลง (easing)
        const progress = elapsed / duration
        // exponential easing: ตอนหลังช้ามาก
        interval = 60 + Math.pow(progress, 3) * 200
        setCurrentAgent(pool[Math.floor(Math.random() * pool.length)])
        setTimeout(tick, interval)
      }
      tick()
    }, delay)

    return () => clearTimeout(startTimer)
    // เจตนา rerun เมื่อ finalAgent เปลี่ยน (สุ่มใหม่)
  }, [finalAgent.uuid, delay, duration])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 }}
      className={cn(
        'relative aspect-[3/4] overflow-hidden clip-val',
        'border-2 transition-colors',
        settled
          ? 'border-val-red animate-pulse-red'
          : 'border-val-light/30',
      )}
      style={{
        background: 'linear-gradient(180deg, #1f2731 0%, #0a141f 100%)',
      }}
    >
      {/* portrait ที่กำลังหมุน */}
      <motion.div
        key={currentAgent.uuid}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: settled ? 1 : 0.7 }}
        transition={{ duration: 0.08 }}
        className='absolute inset-0'
      >
        {currentAgent.portrait ? (
          <Image
            src={currentAgent.portrait}
            alt={currentAgent.name}
            fill
            sizes='(max-width: 768px) 50vw, 20vw'
            className='object-cover object-top'
            unoptimized
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center'>
            <Image
              src={currentAgent.icon}
              alt={currentAgent.name}
              width={120}
              height={120}
              unoptimized
            />
          </div>
        )}
      </motion.div>

      {/* glitch overlay ตอนยังหมุน */}
      {!settled && (
        <div className='absolute inset-0 bg-val-red/10 mix-blend-screen pointer-events-none' />
      )}

      <div className='absolute inset-0 bg-gradient-to-t from-val-darker via-transparent to-transparent' />

      {/* ชื่อ agent */}
      <div className='absolute bottom-0 left-0 right-0 p-3'>
        <motion.h3
          key={currentAgent.uuid + '-name'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='font-bebas text-2xl tracking-wider text-val-light leading-none truncate'
        >
          {currentAgent.name}
        </motion.h3>
        <div
          className={cn(
            'h-0.5 mt-1 transition-all',
            settled ? 'w-12 bg-val-red' : 'w-full bg-val-light/30',
          )}
        />
      </div>
    </motion.div>
  )
}
