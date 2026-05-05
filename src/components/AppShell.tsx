'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useTutorialStore } from '@/lib/tutorialStore'
import { useImagePreload } from '@/lib/useImagePreload'
import type { Agent } from '@/lib/types'
import { Header } from './Header'
import { RoomPanel } from './RoomPanel'
import { Randomizer } from './Randomizer'
import { SoloRollGrid } from './SoloRollGrid'
import { BanPanel } from './BanPanel'
import { ModeToggle } from './ModeToggle'
import { NamePrompt } from './NamePrompt'
import { BgmToggle } from './BgmToggle'
import { TutorialOverlay } from './TutorialOverlay'
import { HelpButton } from './HelpButton'

interface AppShellProps {
  initialAgents: Agent[]
  fetchError: string | null
}

export function AppShell({ initialAgents, fetchError }: AppShellProps) {
  const setAgents = useAppStore((s) => s.setAgents)
  const agents = useAppStore((s) => s.agents)
  const hydrateBansFromStorage = useAppStore((s) => s.hydrateBansFromStorage)
  const hydrateProfile = useAppStore((s) => s.hydrateProfile)
  const playerName = useAppStore((s) => s.playerName)
  const playerId = useAppStore((s) => s.playerId)
  const roomCode = useAppStore((s) => s.roomCode)
  const isHost = useAppStore((s) => s.isHost)
  const mode = useAppStore((s) => s.mode)

  const hydrateTutorial = useTutorialStore((s) => s.hydrateFromStorage)
  const tutorialHasSeen = useTutorialStore((s) => s.hasSeenBefore)
  const tutorialOpen = useTutorialStore((s) => s.open)
  const startTutorial = useTutorialStore((s) => s.start)

  useEffect(() => {
    hydrateProfile()
    hydrateTutorial()
  }, [hydrateProfile, hydrateTutorial])

  useEffect(() => {
    if (initialAgents.length > 0 && agents.length === 0) {
      setAgents(initialAgents)
    }
  }, [initialAgents, agents.length, setAgents])

  useEffect(() => {
    const isViewer = roomCode !== null && !isHost
    if (!isViewer) {
      hydrateBansFromStorage()
    }
  }, [roomCode, isHost, hydrateBansFromStorage])

  const { ready: imagesReady, progress } = useImagePreload(agents)
  const needsName = playerId === null || playerName.trim().length === 0

  // auto start tutorial: หลัง user กรอกชื่อเสร็จ + ยังไม่เคยเห็น + agents โหลดเสร็จ
  useEffect(() => {
    if (needsName) return
    if (tutorialHasSeen) return
    if (!imagesReady) return
    // delay เล็กน้อยเพื่อให้ DOM render เสร็จ + sync กับ NamePrompt fade out
    const t = setTimeout(() => {
      startTutorial()
    }, 600)
    return () => clearTimeout(t)
  }, [needsName, tutorialHasSeen, imagesReady, startTutorial])

  return (
    <div className='relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-16'>
      <Header />

      {fetchError ? (
        <div className='mt-8 p-6 border border-val-red bg-val-red/10 clip-val-sm'>
          <h2 className='font-bebas text-2xl text-val-red tracking-widest'>
            FETCH ERROR
          </h2>
          <p className='text-sm text-val-light/70 mt-2'>
            ไม่สามารถโหลดข้อมูล agent จาก valorant-api.com ได้
          </p>
          <pre className='text-xs text-val-light/50 mt-2 overflow-auto'>
            {fetchError}
          </pre>
        </div>
      ) : (
        <main className='mt-6 space-y-6'>
          {/* preload progress bar */}
          {!imagesReady && agents.length > 0 && (
            <div className='p-3 bg-val-darker/60 border border-val-light/10 clip-val-sm'>
              <div className='flex items-center justify-between mb-2'>
                <span className='font-bebas text-xs tracking-widest text-val-light/60'>
                  PRELOADING AGENTS
                </span>
                <span className='font-bebas text-xs text-val-red'>
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className='h-1 bg-val-accent/40 overflow-hidden'>
                <div
                  className='h-full bg-val-red transition-all duration-300'
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ===== INFO SECTION ===== */}
          <div data-tutorial-id='tut-room'>
            <RoomPanel />
          </div>

          {/* ===== DIVIDER ===== */}
          <SectionDivider label='RANDOMIZER' />

          {/* ===== RANDOMIZER SECTION ===== */}
          <div data-tutorial-id='tut-mode'>
            <ModeToggle />
          </div>
          <div data-tutorial-id='tut-ban'>
            <BanPanel />
          </div>

          <div data-tutorial-id='tut-roll'>
            {mode === 'team' ? <Randomizer /> : <SoloRollGrid />}
          </div>

          <footer className='pt-12 text-center text-xs text-val-light/30'>
            <p>Agent data: valorant-api.com · Not affiliated with Riot Games</p>
            <p className='mt-1 text-val-light/30'>
              © {new Date().getFullYear()} Made by <a href="https://github.com/ThanwaTbp" target="_blank" rel="noopener noreferrer" className="underline hover:text-val-red">ThanwaTbp</a>
            </p>
       
          </footer>
        </main>
      )}

      {needsName && <NamePrompt />}
      {!needsName && (
        <>
          <BgmToggle />
          <HelpButton />
        </>
      )}
      {tutorialOpen && <TutorialOverlay />}
    </div>
  )
}

// แถบเส้นคั่น section + label ตรงกลาง — สไตล์ valorant
function SectionDivider({ label }: { label: string }) {
  return (
    <div className='relative flex items-center py-4' aria-hidden='true'>
      <div className='flex-1 h-px bg-gradient-to-r from-transparent via-val-red/50 to-val-red/80' />
      <div className='px-4 flex items-center gap-3'>
        <div className='w-1.5 h-1.5 bg-val-red rotate-45' />
        <span className='font-bebas text-sm tracking-[0.4em] text-val-light/70'>
          {label}
        </span>
        <div className='w-1.5 h-1.5 bg-val-red rotate-45' />
      </div>
      <div className='flex-1 h-px bg-gradient-to-l from-transparent via-val-red/50 to-val-red/80' />
    </div>
  )
}
