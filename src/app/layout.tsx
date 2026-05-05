import type { Metadata } from 'next'
import { Rajdhani, Bebas_Neue, Kanit } from 'next/font/google'
import './globals.css'

// font หลักสำหรับ EN — body
const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
})

// font สำหรับ heading EN — ฟีลเกม
const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-bebas',
})

// font สำหรับภาษาไทย — Kanit (geometric sans เข้ากับสไตล์ valorant)
const kanit = Kanit({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-kanit',
})

export const metadata: Metadata = {
  title: 'VALORANT AGENT RANDOMIZER',
  description: 'สุ่มตัวละคร Valorant ให้ครบทีม พร้อมเพื่อนเห็นพร้อมกัน',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang='th'
      className={`${rajdhani.variable} ${bebas.variable} ${kanit.variable}`}
    >
      <body className='antialiased min-h-screen'>{children}</body>
    </html>
  )
}
