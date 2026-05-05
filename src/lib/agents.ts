import type { Agent, ValorantApiAgent } from './types'

// endpoint ของ valorant-api ที่ user ระบุ
const AGENTS_ENDPOINT = 'https://valorant-api.com/v1/agents?isPlayableCharacter=true'

// ดึง agents จาก valorant-api แล้ว map เป็น shape ที่ใช้ในแอป
// ใช้ fetch ของ Next.js พร้อม revalidate รายชั่วโมง (agent ไม่ได้เพิ่มบ่อย)
export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(AGENTS_ENDPOINT, {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`fetch agents failed: ${res.status}`)
  }

  const json = (await res.json()) as { data: ValorantApiAgent[] }

  // map + filter — กัน agent ที่ไม่มี role (เคสประหลาด เช่น sova ซ้ำ)
  return json.data
    .filter((a) => a.role !== null)
    .map<Agent>((a) => ({
      uuid: a.uuid,
      name: a.displayName,
      role: a.role!.displayName,
      icon: a.displayIcon,
      portrait: a.fullPortrait,
      bgColors: a.backgroundGradientColors ?? [],
    }))
    // เรียงตาม role แล้วชื่อ ให้ list คงที่
    .sort((x, y) => {
      if (x.role !== y.role) return x.role.localeCompare(y.role)
      return x.name.localeCompare(y.name)
    })
}
