'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import type { Agent, AgentRole } from '@/lib/types'
import { cn } from '@/lib/utils'

// สี role ใช้ใน badge
const ROLE_COLOR: Record<AgentRole, string> = {
  Duelist: 'bg-red-500',
  Initiator: 'bg-yellow-500',
  Controller: 'bg-purple-500',
  Sentinel: 'bg-emerald-500',
}

interface AgentCardProps {
  agent: Agent
  // index ของ card ใน list (ใช้ stagger animation)
  index?: number
  // revealed = true ตอนแสดงผลสุดท้าย (เปิดการ์ด)
  revealed?: boolean
}

export function AgentCard({ agent, index = 0, revealed = true }: AgentCardProps) {
  // gradient จากสีของ agent (api ส่งมาเป็น hex 8 หลัก rgba)
  // เอา 6 หลักแรก + alpha เป็น 1
  const gradient =
    agent.bgColors.length >= 2
      ? `linear-gradient(180deg, #${agent.bgColors[0].slice(0, 6)} 0%, #${agent.bgColors[2]?.slice(0, 6) ?? agent.bgColors[1].slice(0, 6)} 100%)`
      : 'linear-gradient(180deg, #1f2731 0%, #0a141f 100%)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateY: -90 }}
      animate={{
        opacity: revealed ? 1 : 0.3,
        y: 0,
        rotateY: revealed ? 0 : -90,
      }}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.22, 1, 0.36, 1],
      }}
      className='relative group'
      style={{ perspective: 1000 }}
    >
      <div
        className={cn(
          'relative aspect-[3/4] overflow-hidden clip-val',
          'border-2 border-val-red/60',
          'shadow-[0_0_30px_rgba(255,70,85,0.3)]',
          'group-hover:shadow-[0_0_50px_rgba(255,70,85,0.6)]',
          'transition-shadow duration-300',
        )}
        style={{ background: gradient }}
      >
        {/* portrait — ถ้าไม่มีใช้ icon แทน */}
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
            <Image
              src={agent.icon}
              alt={agent.name}
              width={120}
              height={120}
              unoptimized
            />
          </div>
        )}

        {/* overlay gradient ด้านล่าง */}
        <div className='absolute inset-0 bg-gradient-to-t from-val-darker via-transparent to-transparent' />

        {/* role badge มุมบนซ้าย */}
        <div
          className={cn(
            'absolute top-3 left-3 px-2 py-1 text-xs font-bebas tracking-widest text-val-light',
            ROLE_COLOR[agent.role],
          )}
        >
          {agent.role}
        </div>

        {/* ชื่อ agent ที่ล่าง */}
        <div className='absolute bottom-0 left-0 right-0 p-4'>
          <h3 className='font-bebas text-3xl tracking-wider text-val-light leading-none'>
            {agent.name}
          </h3>
          <div className='h-0.5 w-12 bg-val-red mt-2' />
        </div>
      </div>
    </motion.div>
  )
}

// skeleton card ตอนยังไม่สุ่ม / กำลังสุ่ม
export function AgentCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className='aspect-[3/4] clip-val border-2 border-val-light/10 bg-val-accent/30 relative overflow-hidden'
    >
      <div className='absolute inset-0 flex items-center justify-center'>
        <span className='font-bebas text-6xl text-val-light/20'>?</span>
      </div>
      {/* shimmer */}
      <motion.div
        className='absolute inset-0 bg-gradient-to-r from-transparent via-val-red/20 to-transparent'
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  )
}
