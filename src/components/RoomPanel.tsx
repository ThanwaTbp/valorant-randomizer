'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { generateRoomCode } from '@/lib/randomizer'
import { isRealtimeReady } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Copy, Check, Users, LogOut, Edit2 } from 'lucide-react'

export function RoomPanel() {
  const roomCode = useAppStore((s) => s.roomCode)
  const isHost = useAppStore((s) => s.isHost)
  const memberCount = useAppStore((s) => s.memberCount)
  const players = useAppStore((s) => s.players)
  const playerName = useAppStore((s) => s.playerName)
  const playerId = useAppStore((s) => s.playerId)
  const setRoom = useAppStore((s) => s.setRoom)
  const setProfile = useAppStore((s) => s.setProfile)
  const reset = useAppStore((s) => s.reset)

  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState('')

  const realtimeReady = isRealtimeReady()

  function handleCreate() {
    if (!realtimeReady) {
      setError('REALTIME OFFLINE — รันแบบ single-player ได้ แต่เพื่อนจะไม่เห็น')
      return
    }
    setRoom(generateRoomCode(), true)
    setError('')
  }

  function handleJoin() {
    if (!realtimeReady) {
      setError('REALTIME OFFLINE — ตั้ง env supabase ก่อน')
      return
    }
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) {
      setError('CODE ต้อง 6 ตัวอักษร')
      return
    }
    setRoom(code, false)
    setError('')
  }

  function handleLeave() {
    setRoom(null, false)
    reset()
    setJoinCode('')
  }

  async function handleCopy() {
    if (!roomCode) return
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  function handleStartEditName() {
    setTempName(playerName)
    setEditingName(true)
  }

  function handleSaveName() {
    const t = tempName.trim()
    if (t.length === 0) return
    setProfile(t)
    setEditingName(false)
  }

  // ถ้าอยู่ในห้องแล้ว — แสดง info + member list
  if (roomCode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className='space-y-3'
      >
        {/* row 1: room code + member count + leave */}
        <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-val-darker/60 border border-val-red/40 clip-val-sm'>
          <div className='flex-1'>
            <div className='text-xs font-bebas tracking-widest text-val-light/60'>
              ROOM CODE {isHost && <span className='text-val-red'>· HOST</span>}
            </div>
            <div className='flex items-center gap-3 mt-1'>
              <span className='font-bebas text-3xl tracking-[0.4em] text-val-red'>
                {roomCode}
              </span>
              <button
                onClick={handleCopy}
                className='p-1.5 hover:bg-val-red/20 transition-colors'
                aria-label='copy room code'
              >
                {copied ? (
                  <Check className='w-4 h-4 text-val-mint' />
                ) : (
                  <Copy className='w-4 h-4 text-val-light/70' />
                )}
              </button>
            </div>
          </div>

          <div className='flex items-center gap-2 text-val-light/70'>
            <Users className='w-4 h-4' />
            <span className='font-bebas tracking-widest'>{memberCount}</span>
          </div>

          <Button variant='ghost' size='sm' onClick={handleLeave}>
            <LogOut className='w-4 h-4 mr-2' /> LEAVE
          </Button>
        </div>

        {/* row 2: player list */}
        <div className='p-3 bg-val-darker/40 border border-val-light/10 clip-val-sm'>
          <div className='font-bebas text-xs tracking-widest text-val-light/50 mb-2 px-1'>
            ผู้เล่นใน ROOM ({players.length})
          </div>
          <div className='flex flex-wrap gap-2'>
            {players.map((p) => {
              const isMe = p.id === playerId
              return (
                <span
                  key={p.id}
                  className={
                    isMe
                      ? 'px-3 py-1 bg-val-red text-val-light font-bebas text-sm tracking-widest'
                      : 'px-3 py-1 bg-val-accent/60 text-val-light/80 font-bebas text-sm tracking-widest'
                  }
                >
                  {p.name} {isMe && '· YOU'}
                </span>
              )
            })}
            {players.length === 0 && (
              <span className='text-xs text-val-light/40 px-1'>
                เชื่อมต่อ...
              </span>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // ยังไม่อยู่ในห้อง — แสดงตัวเลือก
  return (
    <div className='space-y-4'>
      {/* แสดงชื่อตัวเอง + แก้ได้ */}
      <div className='flex items-center justify-between p-3 bg-val-darker/40 border border-val-light/10 clip-val-sm'>
        <div className='flex items-center gap-2'>
          <span className='font-bebas text-xs tracking-widest text-val-light/50'>
            คุณ:
          </span>
          {editingName ? (
            <input
              type='text'
              value={tempName}
              maxLength={20}
              autoFocus
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName()
                if (e.key === 'Escape') setEditingName(false)
              }}
              className='bg-val-accent/40 px-2 py-1 font-bebas tracking-widest text-val-light outline-none border-b border-val-red'
            />
          ) : (
            <span className='font-bebas tracking-widest text-val-light'>
              {playerName}
            </span>
          )}
        </div>
        {!editingName && (
          <button
            onClick={handleStartEditName}
            className='p-1.5 hover:bg-val-red/20 transition-colors'
            aria-label='edit name'
          >
            <Edit2 className='w-3 h-3 text-val-light/60' />
          </button>
        )}
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='p-6 bg-val-darker/60 border border-val-light/10 clip-val-sm'>
          <h3 className='font-bebas text-2xl tracking-widest text-val-light mb-2'>
            CREATE ROOM
          </h3>
          <p className='text-sm text-val-light/60 mb-4'>
            สร้างห้องใหม่ คุณเป็น HOST · คุม mode + ban
          </p>
          <Button onClick={handleCreate} className='w-full'>
            สร้างห้อง
          </Button>
        </div>

        <div className='p-6 bg-val-darker/60 border border-val-light/10 clip-val-sm'>
          <h3 className='font-bebas text-2xl tracking-widest text-val-light mb-2'>
            JOIN ROOM
          </h3>
          <p className='text-sm text-val-light/60 mb-4'>
            ใส่ ROOM CODE ที่เพื่อนส่งมา (6 ตัวอักษร)
          </p>
          <div className='flex gap-2'>
            <Input
              placeholder='XXXXXX'
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <Button variant='outline' onClick={handleJoin}>
              เข้า
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className='text-sm text-val-red font-bebas tracking-wider px-4'>
          ⚠ {error}
        </div>
      )}

      {!realtimeReady && (
        <div className='text-xs text-val-light/40 px-4'>
          NOTE: ยังไม่ได้ตั้ง Supabase env — single-player ใช้ได้ แต่เพื่อนจะไม่เห็นพร้อมกัน
        </div>
      )}
    </div>
  )
}
