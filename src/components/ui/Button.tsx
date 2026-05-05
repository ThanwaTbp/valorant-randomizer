'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// variants ตาม pattern ของ shadcn — ปรับสีเป็นโทน valorant
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-bebas tracking-widest text-base transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 uppercase',
  {
    variants: {
      variant: {
        primary:
          'bg-val-red text-val-light hover:bg-val-red/90 clip-val px-8 py-3 hover:shadow-[0_0_30px_rgba(255,70,85,0.6)]',
        ghost:
          'bg-val-accent/40 text-val-light hover:bg-val-accent/70 clip-val-sm px-6 py-2 border border-val-light/10',
        outline:
          'border-2 border-val-red text-val-red hover:bg-val-red hover:text-val-light clip-val px-8 py-3',
        icon: 'bg-val-accent/40 hover:bg-val-red text-val-light p-2 rounded-sm',
      },
      size: {
        default: '',
        sm: 'text-sm px-4 py-1.5',
        lg: 'text-xl px-12 py-4',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
