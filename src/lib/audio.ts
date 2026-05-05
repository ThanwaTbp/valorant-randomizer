'use client'

// audio system
// - SFX: synth ด้วย Web Audio API (ไม่ต้องมีไฟล์)
// - BGM: HTMLAudioElement loop ไฟล์ /audio/bgm.mp3
// singleton ทั้งหมดอยู่ใน module scope — share ระหว่าง components

let audioCtx: AudioContext | null = null
let bgmEl: HTMLAudioElement | null = null
let bgmEnabled = true
let sfxEnabled = true

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      audioCtx = new Ctx()
    } catch {
      return null
    }
  }
  // resume ถ้า suspended (browser policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

// ---------- SFX synth ----------

// helper สร้าง envelope envelope ง่ายๆ
function envelopedTone(opts: {
  freq: number
  duration: number
  type?: OscillatorType
  attack?: number
  release?: number
  volume?: number
  // freq sweep ปลายทาง (optional)
  freqEnd?: number
  startAt?: number
}) {
  const ctx = getCtx()
  if (!ctx || !sfxEnabled) return
  const {
    freq,
    duration,
    type = 'sine',
    attack = 0.005,
    release = 0.1,
    volume = 0.3,
    freqEnd,
    startAt = 0,
  } = opts
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const now = ctx.currentTime + startAt
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(freqEnd, 1),
      now + duration,
    )
  }
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + attack)
  gain.gain.linearRampToValueAtTime(volume, now + duration - release)
  gain.gain.linearRampToValueAtTime(0, now + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.05)
}

// noise burst สำหรับ tick/click
function noiseBurst(duration: number, volume = 0.15, startAt = 0) {
  const ctx = getCtx()
  if (!ctx || !sfxEnabled) return
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 2000
  src.buffer = buffer
  gain.gain.value = volume
  src.connect(filter).connect(gain).connect(ctx.destination)
  const now = ctx.currentTime + startAt
  src.start(now)
}

// SFX: กดสุ่ม — เสียง "เริ่มหมุน" คล้าย slot machine spin-up
export function playSpinSfx() {
  // tick rapid ๆ ขึ้น pitch — ฟีลกำลังเร่ง
  for (let i = 0; i < 8; i++) {
    noiseBurst(0.04, 0.1, i * 0.05)
    envelopedTone({
      freq: 200 + i * 80,
      duration: 0.06,
      type: 'square',
      volume: 0.08,
      attack: 0.001,
      release: 0.04,
      startAt: i * 0.05,
    })
  }
  // whoosh ปิดท้าย
  envelopedTone({
    freq: 1200,
    freqEnd: 200,
    duration: 0.5,
    type: 'sawtooth',
    volume: 0.15,
    startAt: 0.4,
  })
}

// SFX: ผลลัพธ์ — fanfare สั้นๆ "ตึ๊งงง!"
export function playRevealSfx() {
  // chord 3 โน้ต (major) — sounds positive
  const chord = [523.25, 659.25, 783.99] // C5, E5, G5
  for (const f of chord) {
    envelopedTone({
      freq: f,
      duration: 0.6,
      type: 'sine',
      volume: 0.18,
      attack: 0.01,
      release: 0.4,
    })
  }
  // เสียง impact ตอนแรก
  envelopedTone({
    freq: 80,
    freqEnd: 40,
    duration: 0.2,
    type: 'sine',
    volume: 0.4,
    attack: 0.001,
    release: 0.15,
  })
  noiseBurst(0.08, 0.2)
}

// SFX: hover/click ปุ่ม (subtle)
export function playClickSfx() {
  envelopedTone({
    freq: 800,
    duration: 0.05,
    type: 'square',
    volume: 0.06,
    attack: 0.001,
    release: 0.04,
  })
}

export function setSfxEnabled(b: boolean) {
  sfxEnabled = b
}

export function isSfxEnabled() {
  return sfxEnabled
}

// ---------- BGM ----------

const BGM_PATH = '/audio/bgm.mp3'

function getBgmEl(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!bgmEl) {
    bgmEl = new Audio(BGM_PATH)
    bgmEl.loop = true
    bgmEl.volume = 0.1
  }
  return bgmEl
}

// ลองเล่น BGM — return promise ที่ resolve เป็น true ถ้าสำเร็จ false ถ้า browser block
export async function tryPlayBgm(): Promise<boolean> {
  if (!bgmEnabled) return false
  const el = getBgmEl()
  if (!el) return false
  try {
    await el.play()
    return true
  } catch {
    // browser block autoplay — ไม่ใช่ error จริง
    return false
  }
}

export function pauseBgm() {
  const el = getBgmEl()
  if (el) el.pause()
}

export function setBgmEnabled(b: boolean) {
  bgmEnabled = b
  if (!b) pauseBgm()
}

export function isBgmEnabled() {
  return bgmEnabled
}

export function isBgmPlaying(): boolean {
  const el = bgmEl
  return el ? !el.paused : false
}

// volume control 0-1
export function setBgmVolume(v: number) {
  const el = getBgmEl()
  if (el) el.volume = Math.max(0, Math.min(1, v))
}

// ลองเล่นแบบ muted (browser ส่วนใหญ่ยอมให้ autoplay เมื่อ muted=true)
// คืน true ถ้าสำเร็จ — caller จะ fade volume ขึ้นเอง
export async function tryPlayBgmMuted(): Promise<boolean> {
  if (!bgmEnabled) return false
  const el = getBgmEl()
  if (!el) return false
  el.muted = true
  el.volume = 0
  try {
    await el.play()
    return true
  } catch {
    el.muted = false
    return false
  }
}

// fade volume จากปัจจุบัน → target ใน duration ms
// ใช้ rAF เนียนกว่า setInterval
export function fadeBgmTo(target: number, durationMs: number): void {
  const el = getBgmEl()
  if (!el) return
  // unmute ก่อน — ถ้าไม่ unmute volume ไม่มีผล
  el.muted = false
  const start = el.volume
  const clamped = Math.max(0, Math.min(1, target))
  const t0 = performance.now()
  function step(now: number) {
    const t = Math.min(1, (now - t0) / durationMs)
    el!.volume = start + (clamped - start) * t
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
