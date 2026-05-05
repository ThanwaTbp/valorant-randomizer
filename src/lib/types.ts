// type ของ agent ตาม schema valorant-api.com/v1/agents
export type AgentRole = 'Duelist' | 'Initiator' | 'Controller' | 'Sentinel'

export interface ValorantApiRole {
  uuid: string
  displayName: AgentRole
  displayIcon: string
}

export interface ValorantApiAgent {
  uuid: string
  displayName: string
  description: string
  developerName: string
  displayIcon: string
  fullPortrait: string | null
  bustPortrait: string | null
  killfeedPortrait: string
  background: string | null
  backgroundGradientColors: string[]
  isPlayableCharacter: boolean
  role: ValorantApiRole | null
}

// shape ที่ใช้ในแอป — slim ลงให้เหลือเฉพาะที่ต้องใช้
export interface Agent {
  uuid: string
  name: string
  role: AgentRole
  icon: string
  portrait: string | null
  bgColors: string[]
}

// 2 โหมด:
// team = สุ่ม N ตัวพร้อมกัน (ของเดิม) · assign ให้ N คนแรกตามลำดับ join
// solo = แต่ละคนกดสุ่มของตัวเอง 1 ตัว · ห้ามซ้ำ
export type GameMode = 'team' | 'solo'

// player ใน room — ระบุด้วย playerId ที่ฝั่ง client gen ตอน join
export interface Player {
  id: string
  name: string
  joinedAt: number
}

// payload Team Roll — ของเดิม + roundId
export interface RandomizePayload {
  roundId: string
  seed: number
  count: number
  agentUuids: string[]
  fullTeam: boolean
  startedAt: number
}

// payload Solo Roll — broadcast ตอนคน 1 คนกดสุ่มสำเร็จ (claim ตัวละคร)
export interface SoloRollPayload {
  // playerId ของคนที่ roll
  playerId: string
  // ตัวที่ได้
  agentUuid: string
  // round id ตอน roll นี้ (ใช้แสดง animation)
  roundId: string
  startedAt: number
}

// payload sync ban list
export interface BanListPayload {
  bannedUuids: string[]
}

// payload sync game mode (host เปลี่ยน)
export interface ModeSyncPayload {
  mode: GameMode
}

// payload reset solo round — host กด reset ล้างผลทุกคน
export interface SoloResetPayload {
  resetAt: number
}
