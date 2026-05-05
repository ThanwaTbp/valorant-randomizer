'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// input ทรง valorant — เส้นล่างแดง + ตัวอักษร rajdhani
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full bg-val-darker/60 border-b-2 border-val-red/60 px-4 py-3',
        'text-val-light text-2xl tracking-[0.3em] font-bebas',
        'focus:outline-none focus:border-val-red focus:bg-val-darker',
        'placeholder:text-val-light/30 uppercase',
        'transition-colors',
        className,
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'

// toggle switch สำหรับ "ครบทีม"
interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 cursor-pointer select-none',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-12 h-6 transition-colors clip-val-sm',
          checked ? 'bg-val-red' : 'bg-val-accent/60',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-5 h-5 bg-val-light transition-transform',
            checked ? 'translate-x-6' : 'translate-x-0.5',
          )}
        />
      </button>
      {label && (
        <span className='font-bebas tracking-widest text-val-light/90'>
          {label}
        </span>
      )}
    </label>
  )
}
