'use client'

import { useTutorialStore } from '@/lib/tutorialStore'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ปุ่ม ? ลอย — มุมขวาบน อยู่ข้างๆ BgmToggle
// อยู่ทาง "ซ้ายของ BgmToggle" เพราะ BgmToggle = right-4
export function HelpButton() {
  const start = useTutorialStore((s) => s.start)

  return (
    <button
      onClick={start}
      className={cn(
        'fixed sm:top-4 top-[unset] sm:bottom-[unset] bottom-4 right-20 z-40 p-3 transition-all clip-val-sm border-2',
        'bg-val-darker/80 border-val-light/20 text-val-light/60',
        'hover:border-val-red/60 hover:text-val-red',
      )}
      aria-label='เปิด tutorial'
      title='วิธีใช้'
    >
      <HelpCircle className='w-5 h-5' />
    </button>
  )
}
