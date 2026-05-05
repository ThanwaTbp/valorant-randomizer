'use client'

import { create } from 'zustand'

const TUTORIAL_SEEN_KEY = 'valorant-randomizer:tutorial-seen'

// step ของ tutorial — id ต้องตรงกับ data-tutorial-id ใน DOM
export interface TutorialStep {
  id: string
  // selector หรือ data-tutorial-id ของ element เป้า
  targetId: string
  title: string
  description: string
  // ตำแหน่ง tooltip relative ต่อ target — ถ้าไม่ใส่ auto
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'room',
    targetId: 'tut-room',
    title: '1. สร้าง / เข้าห้อง',
    description:
      'สร้างห้องใหม่เพื่อแชร์ ROOM CODE ให้เพื่อน หรือเข้าห้องของคนอื่นด้วย code 6 ตัวอักษร',
    placement: 'bottom',
  },
  {
    id: 'mode',
    targetId: 'tut-mode',
    title: '2. เลือกโหมด',
    description:
      'TEAM ROLL — ทุกคนเห็นผลเดียวกัน · SOLO ROLL — แต่ละคนสุ่มของตัวเอง ห้ามซ้ำ',
    placement: 'bottom',
  },
  {
    id: 'ban',
    targetId: 'tut-ban',
    title: '3. Ban ตัวที่ไม่อยากเล่น',
    description:
      'กดที่ BAN LIST แล้วเลือกตัวละครที่ไม่อยากให้สุ่มเจอ (ไม่บังคับ)',
    placement: 'bottom',
  },
  {
    id: 'roll',
    targetId: 'tut-roll',
    title: '4. กดสุ่ม!',
    description: 'กดปุ่มสุ่มเพื่อหมุน slot machine · โหมด TEAM ROLL — เพื่อนหรือคุณกดก็ได้ · SOLO ROLL — แต่ละคนกดสุ่มของตัวเอง',
    placement: 'top',
  },
  {
    id: 'result',
    targetId: 'tut-roll',
    title: '5. ดูผลลัพธ์',
    description: 'ผลลัพธ์จะแสดงข้างล่าง พร้อมชื่อผู้เล่นใต้การ์ดแต่ละใบ',
    placement: 'top',
  },
]

interface TutorialState {
  open: boolean
  stepIndex: number
  hasSeenBefore: boolean

  start: () => void
  next: () => void
  prev: () => void
  skip: () => void
  hydrateFromStorage: () => void
}

function lsGetSeen(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function lsSetSeen(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1')
  } catch {}
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  open: false,
  stepIndex: 0,
  hasSeenBefore: false,

  start: () => set({ open: true, stepIndex: 0 }),

  next: () => {
    const { stepIndex } = get()
    if (stepIndex >= TUTORIAL_STEPS.length - 1) {
      // จบ — mark seen + ปิด
      lsSetSeen()
      set({ open: false, stepIndex: 0, hasSeenBefore: true })
    } else {
      set({ stepIndex: stepIndex + 1 })
    }
  },

  prev: () => {
    const { stepIndex } = get()
    if (stepIndex > 0) set({ stepIndex: stepIndex - 1 })
  },

  skip: () => {
    lsSetSeen()
    set({ open: false, stepIndex: 0, hasSeenBefore: true })
  },

  hydrateFromStorage: () => {
    set({ hasSeenBefore: lsGetSeen() })
  },
}))
