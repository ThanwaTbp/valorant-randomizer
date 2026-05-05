import { create } from 'zustand'
import type {
  Agent,
  GameMode,
  Player,
  RandomizePayload,
  SoloRollPayload,
} from './types'

const BAN_STORAGE_KEY = 'valorant-randomizer:bans'
const PROFILE_STORAGE_KEY = 'valorant-randomizer:profile'

const ROLLING_DURATION_MS = 2200

// localStorage helpers (client only) — เงียบเมื่อ fail
function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
function lsSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// ---------------- types ภายใน store ----------------

export type Phase = 'idle' | 'rolling' | 'done'

// solo roll ของแต่ละคน
export interface SoloResult {
  playerId: string
  agentUuid: string
  roundId: string
  // ใช้ track ว่ายัง rolling หรือ done
  done: boolean
}

interface AppState {
  // profile (ของตัวเอง)
  playerId: string | null
  playerName: string

  // room
  roomCode: string | null
  isHost: boolean
  memberCount: number
  // members ทั้งหมดใน room (จาก presence) เรียงตาม joinedAt
  players: Player[]

  // agent pool
  agents: Agent[]

  // settings (host คุม sync)
  mode: GameMode
  count: number
  fullTeam: boolean

  // ban
  bannedUuids: string[]

  // ผลลัพธ์ Team Roll
  phase: Phase
  result: Agent[]
  lastPayload: RandomizePayload | null

  // ผลลัพธ์ Solo Roll — รวมของทุกคน key by playerId
  soloResults: Record<string, SoloResult>

  // actions
  setProfile: (name: string) => void
  hydrateProfile: () => void
  setAgents: (a: Agent[]) => void
  setRoom: (code: string | null, isHost: boolean) => void
  setMemberCount: (n: number) => void
  setPlayers: (p: Player[]) => void
  setMode: (m: GameMode) => void
  setCount: (n: number) => void
  setFullTeam: (b: boolean) => void
  setPhase: (p: Phase) => void
  setResult: (r: Agent[]) => void
  setLastPayload: (p: RandomizePayload | null) => void

  toggleBan: (uuid: string, persist: boolean) => void
  clearBans: (persist: boolean) => void
  setBansFromHost: (uuids: string[]) => void
  hydrateBansFromStorage: () => void

  applyRandomize: (payload: RandomizePayload, isSelf: boolean) => boolean
  applySoloRoll: (payload: SoloRollPayload) => boolean
  resetSoloRolls: () => void

  reset: () => void
}

// gen playerId ครั้งเดียวต่อ session
function genPlayerId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `p-${Date.now()}-${Math.random()}`
}

export const useAppStore = create<AppState>((set, get) => ({
  playerId: null,
  playerName: '',

  roomCode: null,
  isHost: false,
  memberCount: 1,
  players: [],

  agents: [],

  mode: 'team',
  count: 5,
  fullTeam: true,

  bannedUuids: [],

  phase: 'idle',
  result: [],
  lastPayload: null,

  soloResults: {},

  setProfile: (name) => {
    const trimmed = name.trim().slice(0, 20)
    let id = get().playerId
    if (!id) id = genPlayerId()
    set({ playerName: trimmed, playerId: id })
    lsSet(PROFILE_STORAGE_KEY, { name: trimmed })
  },

  hydrateProfile: () => {
    const stored = lsGet<{ name?: string }>(PROFILE_STORAGE_KEY, {})
    const name = stored.name ?? ''
    // gen playerId ใหม่ทุก session (กันชนกันถ้าเปิดหลาย tab)
    set({ playerName: name, playerId: genPlayerId() })
  },

  setAgents: (a) => set({ agents: a }),
  setRoom: (code, isHost) => set({ roomCode: code, isHost }),
  setMemberCount: (n) => set({ memberCount: n }),
  setPlayers: (p) => {
    // เรียงตาม joinedAt asc — สำหรับ mapping ตัว→ชื่อใน Mode A
    const sorted = [...p].sort((a, b) => a.joinedAt - b.joinedAt)
    set({ players: sorted })
  },
  setMode: (m) => set({ mode: m }),
  setCount: (n) => set({ count: Math.max(1, Math.min(5, n)) }),
  setFullTeam: (b) => set({ fullTeam: b }),
  setPhase: (p) => set({ phase: p }),
  setResult: (r) => set({ result: r }),
  setLastPayload: (p) => set({ lastPayload: p }),

  toggleBan: (uuid, persist) => {
    const cur = get().bannedUuids
    const next = cur.includes(uuid)
      ? cur.filter((u) => u !== uuid)
      : [...cur, uuid]
    set({ bannedUuids: next })
    if (persist) lsSet(BAN_STORAGE_KEY, next)
  },

  clearBans: (persist) => {
    set({ bannedUuids: [] })
    if (persist) lsSet(BAN_STORAGE_KEY, [])
  },

  setBansFromHost: (uuids) => set({ bannedUuids: uuids }),

  hydrateBansFromStorage: () => {
    const stored = lsGet<string[]>(BAN_STORAGE_KEY, [])
    if (Array.isArray(stored) && stored.length > 0) {
      set({ bannedUuids: stored })
    }
  },

  // Team Roll — first-write-wins
  applyRandomize: (payload, _isSelf) => {
    const state = get()
    const cur = state.lastPayload

    if (cur && state.phase === 'rolling') {
      if (cur.roundId === payload.roundId) return false
      if (payload.startedAt >= cur.startedAt) return false
    }

    const map = new Map(state.agents.map((a) => [a.uuid, a]))
    const resolved = payload.agentUuids
      .map((u) => map.get(u))
      .filter((a): a is Agent => a !== undefined)

    set({ lastPayload: payload, phase: 'rolling' })

    setTimeout(() => {
      const after = get()
      if (after.lastPayload?.roundId === payload.roundId) {
        set({ result: resolved, phase: 'done' })
      }
    }, ROLLING_DURATION_MS)

    return true
  },

  // Solo Roll — เพิ่ม/อัพเดท soloResults[playerId]
  applySoloRoll: (payload) => {
    const cur = get().soloResults[payload.playerId]
    if (cur && cur.done) return false
    if (cur && cur.roundId === payload.roundId) return false

    set((s) => ({
      soloResults: {
        ...s.soloResults,
        [payload.playerId]: {
          playerId: payload.playerId,
          agentUuid: payload.agentUuid,
          roundId: payload.roundId,
          done: false,
        },
      },
    }))

    setTimeout(() => {
      const after = get().soloResults[payload.playerId]
      if (after && after.roundId === payload.roundId) {
        set((s) => ({
          soloResults: {
            ...s.soloResults,
            [payload.playerId]: { ...after, done: true },
          },
        }))
      }
    }, ROLLING_DURATION_MS)

    return true
  },

  resetSoloRolls: () => set({ soloResults: {} }),

  reset: () =>
    set({
      phase: 'idle',
      result: [],
      lastPayload: null,
      soloResults: {},
    }),
}))
