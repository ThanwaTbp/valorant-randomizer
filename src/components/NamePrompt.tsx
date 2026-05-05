'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User } from 'lucide-react'

export function NamePrompt() {
  const setProfile = useAppStore((s) => s.setProfile)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    const trimmed = name.trim()
    if (trimmed.length < 1) {
      setError('กรอกชื่อก่อนครับ')
      return
    }
    if (trimmed.length > 20) {
      setError('ชื่อยาวเกิน 20 ตัวอักษร')
      return
    }
    setProfile(trimmed)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='fixed inset-0 bg-val-darker/95 z-50 flex items-center justify-center p-4'
    >
      <motion.div
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className='w-full max-w-md p-8 bg-val-dark border-2 border-val-red/60 clip-val space-y-6'
      >
        <div className='flex items-center gap-3'>
          <User className='w-6 h-6 text-val-red' />
          <h2 className='font-bebas text-3xl tracking-widest text-val-light'>
            Your Name
          </h2>
        </div>

        <p className='text-sm text-val-light/60'>
          กรอกชื่อเพื่อให้เพื่อนรู้ว่าคุณได้ตัวละครไหน
        </p>

        <div>
          <Input
            placeholder='ชื่อ'
            value={name}
            maxLength={20}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          {error && (
            <p className='text-xs text-val-red mt-2 font-bebas tracking-widest'>
              ⚠ {error}
            </p>
          )}
        </div>

        <Button
          size='lg'
          onClick={handleSubmit}
          disabled={name.trim().length === 0}
          className='w-full'
        >
          ยืนยัน
        </Button>
      </motion.div>
    </motion.div>
  )
}
