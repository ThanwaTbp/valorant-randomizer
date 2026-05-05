'use client'

import { useEffect, useState } from 'react'
import type { Agent } from './types'

// preload รูปทั้งหมดของ agent pool — สร้าง Image() ไว้ใน memory ให้ browser cache
// คืน progress (0-1) สำหรับแสดง loading bar
export function useImagePreload(agents: Agent[]): {
  ready: boolean
  progress: number
} {
  const [loaded, setLoaded] = useState(0)
  const [total, setTotal] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (agents.length === 0) return

    // รวบรวม URL ที่ต้อง preload — portrait + icon (สอง resolution ที่ใช้บ่อย)
    const urls: string[] = []
    for (const a of agents) {
      if (a.portrait) urls.push(a.portrait)
      if (a.icon) urls.push(a.icon)
    }

    setTotal(urls.length)
    setLoaded(0)
    setReady(false)

    let cancelled = false
    let count = 0

    function tick() {
      count++
      if (cancelled) return
      setLoaded(count)
      if (count >= urls.length) {
        setReady(true)
      }
    }

    for (const url of urls) {
      const img = new Image()
      img.onload = tick
      img.onerror = tick // นับ error เป็น loaded เหมือนกัน ไม่ block ทั้งหมด
      img.src = url
    }

    return () => {
      cancelled = true
    }
  }, [agents])

  const progress = total === 0 ? 0 : loaded / total
  return { ready, progress }
}
