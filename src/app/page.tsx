import { fetchAgents } from '@/lib/agents'
import { AppShell } from '@/components/AppShell'

// server component: fetch agents แล้ว pass ลง client
// revalidate ใน fetchAgents (ค่า 1 ชม.) ก็พอ
export default async function HomePage() {
  let agents: Awaited<ReturnType<typeof fetchAgents>> = []
  let fetchError: string | null = null

  try {
    agents = await fetchAgents()
  } catch (e) {
    fetchError = e instanceof Error ? e.message : 'Unknown error'
  }

  return <AppShell initialAgents={agents} fetchError={fetchError} />
}
