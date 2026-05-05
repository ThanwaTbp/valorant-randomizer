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
// session-scoped — รีเฟรชไม่หลุด, ปิด tab = ออก
const ROOM_SESSION_KEY = 'valorant-randomizer:room'
const PLAYER_ID_SESSION_KEY = 'valorant-randomizer:player-id'

const ROLLING_DURATION_MS = 2200

// Room cap — จำกัดจำนวนคนต่อ 1 ห้อง (ทั้ง Team + Solo mode)
export const ROOM_CAP = 5

// localStorage helpers (persist ข้าม session)
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

// sessionStorage helpers (รีเฟรชไม่หลุด, ปิด tab = หาย)
function ssGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
function ssSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {}
}
function ssRemove(key: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(key)
  } catch {}
}

export type Phase = 'idle' | 'rolling' | 'done'

export interface SoloResult {
  playerId: string
  agentUuid: string
  roundId: string
  done: boolean
}

interface AppState {
  playerId: string | null
  playerName: string

  roomCode: string | null
  isHost: boolean
  memberCount: number
  players: Player[]

  agents: Agent[]

  mode: GameMode
  count: number

  bannedUuids: string[]

  phase: Phase
  result: Agent[]
  lastPayload: RandomizePayload | null

  soloResults: Record<string, SoloResult>

  // ผู้ใช้ปิด overlay หลัง done แล้ว — ใช้ทั้ง Team + Solo mode
  overlayClosed: boolean

  // flag ว่าพยายามเข้าแล้วเต็ม — แสดง error ใน RoomPanel
  roomFull: boolean

  // ตอน hydrate เสร็จแล้ว — กัน race ตอน mount
  hydrated: boolean

  // actions
  setProfile: (name: string) => void
  hydrateProfile: () => void
  setAgents: (a: Agent[]) => void
  setRoom: (code: string | null, isHost: boolean) => void
  setMemberCount: (n: number) => void
  setPlayers: (p: Player[]) => void
  setRoomFull: (b: boolean) => void
  setOverlayClosed: (b: boolean) => void
  setMode: (m: GameMode) => void
  setCount: (n: number) => void
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

  bannedUuids: [],

  phase: 'idle',
  result: [],
  lastPayload: null,

  soloResults: {},

  overlayClosed: false,
  roomFull: false,
  hydrated: false,

  setProfile: (name) => {
    const trimmed = name.trim().slice(0, 20)
    let id = get().playerId
    if (!id) id = genPlayerId()
    set({ playerName: trimmed, playerId: id })
    lsSet(PROFILE_STORAGE_KEY, { name: trimmed })
    ssSet(PLAYER_ID_SESSION_KEY, id)
  },

  hydrateProfile: () => {
    const stored = lsGet<{ name?: string }>(PROFILE_STORAGE_KEY, {})
    const name = stored.name ?? ''
    // playerId: ลอง restore จาก session ก่อน — ถ้าไม่มีค่อย gen ใหม่
    // ทำงี้เพื่อให้รีเฟรชแล้ว Supabase presence จำเราเป็นคนเดิม
    const sessionId = ssGet<string | null>(PLAYER_ID_SESSION_KEY, null)
    const playerId = sessionId ?? genPlayerId()
    if (!sessionId) ssSet(PLAYER_ID_SESSION_KEY, playerId)

    // restore room ถ้ามี (รีเฟรช = กลับเข้า room เดิม)
    const room = ssGet<{ code: string; isHost: boolean } | null>(
      ROOM_SESSION_KEY,
      null,
    )

    set({
      playerName: name,
      playerId,
      roomCode: room?.code ?? null,
      isHost: room?.isHost ?? false,
      hydrated: true,
    })
  },

  setAgents: (a) => set({ agents: a }),

  setRoom: (code, isHost) => {
    set({ roomCode: code, isHost })
    if (code) {
      ssSet(ROOM_SESSION_KEY, { code, isHost })
    } else {
      ssRemove(ROOM_SESSION_KEY)
    }
  },

  setMemberCount: (n) => set({ memberCount: n }),
  setPlayers: (p) => {
    const sorted = [...p].sort((a, b) => a.joinedAt - b.joinedAt)
    set({ players: sorted })
  },
  setRoomFull: (b) => set({ roomFull: b }),
  setOverlayClosed: (b) => set({ overlayClosed: b }),
  setMode: (m) => set({ mode: m }),
  setCount: (n) => set({ count: Math.max(1, Math.min(5, n)) }),
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

    set({ lastPayload: payload, phase: 'rolling', overlayClosed: false })

    setTimeout(() => {
      const after = get()
      if (after.lastPayload?.roundId === payload.roundId) {
        set({ result: resolved, phase: 'done' })
      }
    }, ROLLING_DURATION_MS)

    return true
  },

  applySoloRoll: (payload) => {
    const cur = get().soloResults[payload.playerId]
    if (cur && cur.done) return false
    if (cur && cur.roundId === payload.roundId) return false

    set((s) => ({
      overlayClosed: false,
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
      overlayClosed: false,
    }),
}))
