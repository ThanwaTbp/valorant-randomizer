'use client'

import { useCallback, useRef } from 'react'

// helper สำหรับ scroll ไป element พร้อม offset header
export function useScrollTo(): {
  ref: React.RefObject<HTMLDivElement | null>
  scrollTo: () => void
} {
  const ref = useRef<HTMLDivElement | null>(null)

  const scrollTo = useCallback(() => {
    const el = ref.current
    if (!el) return
    // delay เล็กน้อย ให้ DOM update เสร็จก่อน
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  return { ref, scrollTo }
}
