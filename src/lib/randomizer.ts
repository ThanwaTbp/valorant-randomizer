import type { Agent, AgentRole } from './types'

// PRNG แบบ mulberry32 — deterministic เมื่อใส่ seed เดียวกัน
// เหตุผล: ถึงแม้โหมดที่เลือกคือ 'host หมุนคนเดียว คนอื่นดู' (ส่งผลลัพธ์ผ่าน broadcast)
// ก็ยังเก็บ seed ไว้เผื่ออนาคตอยากเปลี่ยนเป็น 'sync animation' โดยไม่ต้องรื้อโครง
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return function () {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// fisher-yates shuffle ด้วย rng ที่ส่งเข้ามา
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// สุ่มแบบ random ปกติ — ไม่บังคับ role
export function randomAgents(
  agents: Agent[],
  count: number,
  seed: number,
): Agent[] {
  const rng = mulberry32(seed)
  return shuffle(agents, rng).slice(0, count)
}

// สุ่มแบบครบทีม (รองรับ count = 4 หรือ 5):
// - count = 4 → 1 ตัวจากแต่ละ role (Duelist, Initiator, Controller, Sentinel)
// - count = 5 → 4 role + flex 1 ตัว
export function randomFullTeam(
  agents: Agent[],
  seed: number,
  count: number,
): Agent[] {
  const rng = mulberry32(seed)
  const roles: AgentRole[] = ['Duelist', 'Initiator', 'Controller', 'Sentinel']

  const picked: Agent[] = []
  const usedUuids = new Set<string>()

  // หยิบ 1 ตัว/role (เสมอ)
  for (const role of roles) {
    const pool = agents.filter((a) => a.role === role && !usedUuids.has(a.uuid))
    if (pool.length === 0) continue
    const shuffled = shuffle(pool, rng)
    const choice = shuffled[0]
    picked.push(choice)
    usedUuids.add(choice.uuid)
  }

  // flex สำหรับ count > 4
  if (count > 4) {
    const remaining = agents.filter((a) => !usedUuids.has(a.uuid))
    if (remaining.length > 0) {
      const flex = shuffle(remaining, rng)[0]
      picked.push(flex)
    }
  }

  return picked
}

// auto detect ว่าจะใช้ fullTeam ไหม — N=4 หรือ 5 และ pool มี 4 role ครบ
export function shouldUseFullTeam(agents: Agent[], count: number): boolean {
  if (count !== 4 && count !== 5) return false
  return canMakeFullTeam(agents).ok
}

// entry point — auto detect ว่า fullTeam ได้ไหม
export function pickAgents(
  agents: Agent[],
  count: number,
  seed: number,
): Agent[] {
  if (shouldUseFullTeam(agents, count)) {
    return randomFullTeam(agents, seed, count)
  }
  return randomAgents(agents, count, seed)
}

// แปลง uuid list กลับเป็น Agent objects (ใช้ฝั่ง viewer ที่รับ payload จาก host)
export function resolveAgents(agents: Agent[], uuids: string[]): Agent[] {
  const map = new Map(agents.map((a) => [a.uuid, a]))
  return uuids.map((u) => map.get(u)).filter((a): a is Agent => a !== undefined)
}

// random seed ใหม่ — ใช้ Date.now + Math.random กัน collision
export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) ^ Date.now()
}

// generate room code 6 หลัก [A-Z0-9] (ตัด ambiguous: 0,O,1,I,L)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ตัด agent ที่ถูก ban ออกจาก pool
export function filterByBans(agents: Agent[], bannedUuids: string[]): Agent[] {
  if (bannedUuids.length === 0) return agents
  const banned = new Set(bannedUuids)
  return agents.filter((a) => !banned.has(a.uuid))
}

// ตัด agent ที่มีคน claim แล้วออก (สำหรับ Solo Mode ห้ามซ้ำ)
export function filterByClaimed(
  agents: Agent[],
  claimedUuids: string[],
): Agent[] {
  if (claimedUuids.length === 0) return agents
  const claimed = new Set(claimedUuids)
  return agents.filter((a) => !claimed.has(a.uuid))
}

// สุ่ม 1 ตัวสำหรับ Solo Mode
export function pickSoloAgent(
  pool: Agent[],
  seed: number,
): Agent | null {
  if (pool.length === 0) return null
  const rng = mulberry32(seed)
  const idx = Math.floor(rng() * pool.length)
  return pool[idx]
}

// เช็คว่าสุ่มครบทีมได้ไหมหลัง ban
// ต้องมี:
// - 4 role หลักครบ อย่างน้อย role ละ 1 ตัว
// - มี agent เหลือรวมอย่างน้อย 5 ตัว (สำหรับ flex)
export function canMakeFullTeam(agents: Agent[]): {
  ok: boolean
  missingRoles: AgentRole[]
  totalRemaining: number
} {
  const roles: AgentRole[] = ['Duelist', 'Initiator', 'Controller', 'Sentinel']
  const missing = roles.filter(
    (r) => agents.filter((a) => a.role === r).length === 0,
  )
  return {
    ok: missing.length === 0 && agents.length >= 5,
    missingRoles: missing,
    totalRemaining: agents.length,
  }
}
