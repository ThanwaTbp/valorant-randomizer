import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// รวม class ของ tailwind ให้ไม่ทับกัน
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
