'use client'

import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useTutorialStore,
  TUTORIAL_STEPS,
} from '@/lib/tutorialStore'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// padding รอบ element ที่ highlight (px)
const HIGHLIGHT_PADDING = 12
// gap ระหว่าง tooltip กับ element
const TOOLTIP_GAP = 16
// ขนาด tooltip โดยประมาณสำหรับคำนวณ position
const TOOLTIP_WIDTH = 320
const TOOLTIP_HEIGHT = 180

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export function TutorialOverlay() {
  const open = useTutorialStore((s) => s.open)
  const stepIndex = useTutorialStore((s) => s.stepIndex)
  const next = useTutorialStore((s) => s.next)
  const prev = useTutorialStore((s) => s.prev)
  const skip = useTutorialStore((s) => s.skip)

  const step = TUTORIAL_STEPS[stepIndex]
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1
  const isFirst = stepIndex === 0

  const [rect, setRect] = useState<Rect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{
    top: number
    left: number
    placement: 'top' | 'bottom' | 'left' | 'right'
  } | null>(null)

  const rafRef = useRef<number | null>(null)

  // คำนวณตำแหน่งของ target element
  // คำนวณตำแหน่งของ target element
  useLayoutEffect(() => {
    if (!open || !step) return

    const el = document.querySelector<HTMLElement>(
      `[data-tutorial-id="${step.targetId}"]`,
    )
    if (!el) {
      setRect(null)
      return
    }

    // 1. scroll ให้ element อยู่ใน viewport ก่อน — ทำเสมอเพื่อ consistency
    //    (ถ้าอยู่ในจออยู่แล้ว scrollIntoView จะ no-op)
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // 2. measure ทันที + ใช้ rAF loop จนกว่า rect จะนิ่ง
    //    (smooth scroll ใช้เวลา ~300-500ms — เราต้อง track ระหว่างทาง)
    let lastTop = NaN
    let stableFrames = 0
    let cancelled = false

    function measure() {
      if (cancelled) return
      const r = el!.getBoundingClientRect()
      const newRect: Rect = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      }
      // วาด rect ทันทีในแต่ละ frame ระหว่าง scroll → spotlight ติดตามไปด้วย
      setRect(newRect)
      setTooltipPos(computeTooltipPos(newRect, step.placement))

      // เช็คว่า scroll นิ่งหรือยัง (top ไม่เปลี่ยน 3 frames ติด)
      if (Math.abs(r.top - lastTop) < 0.5) {
        stableFrames++
      } else {
        stableFrames = 0
      }
      lastTop = r.top

      if (stableFrames < 3) {
        rafRef.current = requestAnimationFrame(measure)
      }
    }
    rafRef.current = requestAnimationFrame(measure)

    // recompute ตอน resize/scroll หลัง stable
    const onResize = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const newRect: Rect = {
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        }
        setRect(newRect)
        setTooltipPos(computeTooltipPos(newRect, step.placement))
      })
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)

    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [open, step])

  // เปลี่ยน step → ลบ rect เก่า แล้วให้ effect ข้างบน recompute
  useEffect(() => {
    setRect(null)
  }, [stepIndex])

  // กด keyboard: Esc = skip, → = next, ← = prev
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') skip()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, next, prev, skip])

  if (!open || !step) return null

  const padded = rect
    ? {
        top: rect.top - HIGHLIGHT_PADDING,
        left: rect.left - HIGHLIGHT_PADDING,
        width: rect.width + HIGHLIGHT_PADDING * 2,
        height: rect.height + HIGHLIGHT_PADDING * 2,
      }
    : null

  return (
    <div className='fixed inset-0 z-50 pointer-events-none'>
      {/* SVG mask: ดำทึบทั้งจอ + เจาะรูตาม rect */}
      <svg
        className='absolute inset-0 w-full h-full pointer-events-auto'
        onClick={(e) => {
          // กด background นอกรู = ไม่ทำอะไร (กันเผลอกด)
          e.stopPropagation()
        }}
      >
        <defs>
          <mask id='tutorial-mask'>
            <rect width='100%' height='100%' fill='white' />
            {padded && (
              <rect
                x={padded.left}
                y={padded.top}
                width={padded.width}
                height={padded.height}
                rx='8'
                fill='black'
              />
            )}
          </mask>
        </defs>
        <rect
          width='100%'
          height='100%'
          fill='rgba(10, 20, 31, 0.85)'
          mask='url(#tutorial-mask)'
        />
        {/* ขอบเรืองแดงรอบรู */}
        {padded && (
          <rect
            x={padded.left}
            y={padded.top}
            width={padded.width}
            height={padded.height}
            rx='8'
            fill='none'
            stroke='#ff4655'
            strokeWidth='2'
            className='animate-pulse'
          />
        )}
      </svg>

      {/* tooltip */}
      <AnimatePresence mode='wait'>
        {tooltipPos && (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: tooltipPos.top,
              left: tooltipPos.left,
              width: TOOLTIP_WIDTH,
              maxWidth: 'calc(100vw - 32px)',
            }}
            className='pointer-events-auto bg-val-darker border-2 border-val-red clip-val-sm p-5 shadow-[0_0_40px_rgba(255,70,85,0.5)]'
          >
            {/* header */}
            <div className='flex items-start justify-between mb-3'>
              <div>
                <div className='font-bebas text-xs tracking-[0.3em] text-val-red mb-1'>
                  STEP {stepIndex + 1} / {TUTORIAL_STEPS.length}
                </div>
                <h3 className='font-bebas text-2xl tracking-widest text-val-light leading-tight'>
                  {step.title}
                </h3>
              </div>
              <button
                onClick={skip}
                className='p-1 hover:bg-val-red/20 transition-colors flex-shrink-0'
                aria-label='ปิด tutorial'
              >
                <X className='w-4 h-4 text-val-light/60' />
              </button>
            </div>

            {/* description */}
            <p className='text-sm text-val-light/80 leading-relaxed mb-4'>
              {step.description}
            </p>

            {/* progress dots */}
            <div className='flex items-center gap-1.5 mb-4'>
              {TUTORIAL_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 transition-all',
                    i === stepIndex
                      ? 'w-8 bg-val-red'
                      : i < stepIndex
                        ? 'w-1.5 bg-val-red/60'
                        : 'w-1.5 bg-val-light/20',
                  )}
                />
              ))}
            </div>

            {/* buttons */}
            <div className='flex items-center justify-between gap-2'>
              <button
                onClick={skip}
                className='font-bebas text-xs tracking-widest text-val-light/40 hover:text-val-light/70 transition-colors'
              >
                ข้าม
              </button>
              <div className='flex gap-2'>
                {!isFirst && (
                  <Button variant='ghost' size='sm' onClick={prev}>
                    <ChevronLeft className='w-4 h-4 mr-1' /> ก่อนหน้า
                  </Button>
                )}
                <Button size='sm' onClick={next}>
                  {isLast ? 'เสร็จสิ้น' : 'ถัดไป'}
                  {!isLast && <ChevronRight className='w-4 h-4 ml-1' />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// คำนวณตำแหน่ง tooltip ตาม placement (auto fallback ถ้าล้นจอ)
function computeTooltipPos(
  rect: Rect,
  preferred?: 'top' | 'bottom' | 'left' | 'right',
): { top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' } {
  const vw = window.innerWidth
  const vh = window.innerHeight

  // วาง 4 ทิศ แล้วเลือกที่พอดีที่สุด
  const candidates: Array<{
    placement: 'top' | 'bottom' | 'left' | 'right'
    top: number
    left: number
    fits: boolean
  }> = [
    {
      placement: 'bottom',
      top: rect.top + rect.height + TOOLTIP_GAP,
      left: rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2,
      fits: rect.top + rect.height + TOOLTIP_GAP + TOOLTIP_HEIGHT < vh,
    },
    {
      placement: 'top',
      top: rect.top - TOOLTIP_GAP - TOOLTIP_HEIGHT,
      left: rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2,
      fits: rect.top - TOOLTIP_GAP - TOOLTIP_HEIGHT > 0,
    },
    {
      placement: 'right',
      top: rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2,
      left: rect.left + rect.width + TOOLTIP_GAP,
      fits: rect.left + rect.width + TOOLTIP_GAP + TOOLTIP_WIDTH < vw,
    },
    {
      placement: 'left',
      top: rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2,
      left: rect.left - TOOLTIP_GAP - TOOLTIP_WIDTH,
      fits: rect.left - TOOLTIP_GAP - TOOLTIP_WIDTH > 0,
    },
  ]

  // เรียงตาม preferred ก่อน แล้วค่อย fits
  const order = preferred
    ? [preferred, ...['bottom', 'top', 'right', 'left'].filter((p) => p !== preferred)]
    : ['bottom', 'top', 'right', 'left']

  for (const p of order) {
    const c = candidates.find((x) => x.placement === p)
    if (c && c.fits) {
      return clampToViewport(c.top, c.left, c.placement)
    }
  }

  // fallback: bottom + clamp
  const c = candidates[0]
  return clampToViewport(c.top, c.left, c.placement)
}

function clampToViewport(top: number, left: number, placement: 'top' | 'bottom' | 'left' | 'right') {
  const margin = 8
  const vw = window.innerWidth
  const vh = window.innerHeight
  return {
    top: Math.max(margin, Math.min(top, vh - TOOLTIP_HEIGHT - margin)),
    left: Math.max(margin, Math.min(left, vw - TOOLTIP_WIDTH - margin)),
    placement,
  }
}
