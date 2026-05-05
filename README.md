# Valorant Agent Randomizer

สุ่มตัวละคร Valorant ครบทีม + ให้เพื่อนเห็นพร้อมกันโดยไม่ต้องแชร์จอ

## Stack

- **Next.js 15** (App Router, Turbopack)
- **TypeScript** strict mode
- **Tailwind CSS** + custom valorant theme
- **Framer Motion** สำหรับ slot machine + card flip animation
- **Zustand** state management
- **Supabase Realtime** broadcast channel (ไม่ใช้ database)
- **next/font** — Rajdhani + Bebas Neue
- ดึง agent data จาก [valorant-api.com](https://valorant-api.com/)

## ฟีเจอร์

- สุ่มตัวละคร 1–5 ตัว
- โหมดครบทีม: 5 ตัว = 4 role (Duelist/Initiator/Controller/Sentinel) + 1 flex
- **Ban list**: เลือก agent ที่ไม่อยากให้สุ่มได้ — sync ทั้ง room (host คุม) + จำข้าม session ด้วย localStorage (เฉพาะ host)
- **Multiplayer**: สร้างห้องแล้วเพื่อนเข้า room code → **ใครก็กดสุ่มได้** เพื่อนเห็นพร้อมกันทุกคน
- ถ้ากดพร้อมกัน — ใช้ first-write-wins (คนกดก่อนชนะ ทุกคนเห็นผลของคนนั้น)
- ทำงานได้แม้ไม่ตั้ง supabase env (degrade เป็น single-player)

## วิธีรัน

```bash
# 1. ติดตั้ง dependencies (ใช้ bun ตาม skill)
bun install

# 2. (optional) ตั้ง supabase env สำหรับ multiplayer
cp .env.example .env.local
# แล้วใส่ NEXT_PUBLIC_SUPABASE_URL กับ NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. รัน dev server
bun dev
```

เปิด http://localhost:3000

## Setup Supabase (ใช้แค่ realtime channel)

1. สร้าง project ที่ supabase.com (free tier เพียงพอ)
2. ไปที่ Settings → API
3. คัดลอก `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
4. คัดลอก `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. **ไม่ต้องสร้าง table ใดๆ** — ใช้แค่ broadcast channel

## โครงสร้าง

```
src/
├── app/
│   ├── layout.tsx          # font + metadata
│   ├── page.tsx            # server: fetch agents
│   └── globals.css         # theme valorant
├── components/
│   ├── AgentCard.tsx       # การ์ด + skeleton
│   ├── SlotReel.tsx        # animation slot machine
│   ├── Randomizer.tsx      # control + display
│   ├── RoomPanel.tsx       # create/join room
│   ├── BanPanel.tsx        # ban list (sync ทั้ง room)
│   ├── Header.tsx
│   ├── AppShell.tsx        # client root
│   └── ui/
│       ├── Button.tsx
│       └── Input.tsx
└── lib/
    ├── agents.ts           # fetch valorant-api
    ├── randomizer.ts       # PRNG + ครบทีม logic
    ├── store.ts            # zustand
    ├── supabase.ts         # client
    ├── types.ts
    ├── useRoomChannel.ts   # realtime hook
    └── utils.ts            # cn()
```

## วิธีใช้แบบ multiplayer

1. **คนแรก**: กด `สร้างห้อง` → ได้ ROOM CODE (เช่น `VLR2X9`) → copy ส่งให้เพื่อนใน Discord/LINE (คนนี้เป็น "host" ที่คุม ban list)
2. **เพื่อน**: เปิดเว็บ → ใส่ ROOM CODE → กด `เข้า`
3. **ใครก็กดสุ่มได้** — ทุกคนใน room เห็น animation + ผลลัพธ์เดียวกัน
4. ถ้าหลายคนกดพร้อมกัน — first-write-wins (คนที่ timestamp ไปถึง server ก่อน ชนะ)
5. host เป็นคนเดียวที่แก้ ban list ได้ (sync ให้ทุกคนอัตโนมัติ)
