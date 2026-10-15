<script setup lang="ts">
import kolbeColorUrl from '~/assets/images/kolbe_color.svg?url'
import kolbeFUrl from '~/assets/videos/kolbe-f.mp4?url'
import kolbeLUrl from '~/assets/videos/kolbe-l.mp4?url'
import kolbexVUrl from '~/assets/videos/kolbex-v.mp4?url'

const CLIPS: Array<string> = [kolbeFUrl, kolbeLUrl, kolbexVUrl]
/** Video frames are fuller than the SVG, so draw them smaller to keep Kolbe the same size. */
const CLIP_SCALE = 0.91
const WHITE_CUTOFF = 8
const WHITE_FEATHER = 32
const MIN_WAIT_MS = 5000
const WAIT_SPAN_MS = 2001

const canvasEl = ref<HTMLCanvasElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
const clipShowing = ref(false)

let idleTimer: ReturnType<typeof setTimeout> | null = null
let rafId = 0
let disposed = false
let acceptingPlayback = false
let startPlayback: (() => void) | null = null

function randomWaitMs(): number {
  return MIN_WAIT_MS + Math.floor(Math.random() * WAIT_SPAN_MS)
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function clearIdleTimer() {
  if (idleTimer !== null) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
}

function stopDrawing() {
  if (rafId !== 0) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

function knockOutWhite(pixels: Uint8ClampedArray) {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] ?? 0
    const g = pixels[i + 1] ?? 0
    const b = pixels[i + 2] ?? 0
    const dist = Math.max(255 - r, 255 - g, 255 - b)
    if (dist <= WHITE_CUTOFF) {
      pixels[i + 3] = 0
      continue
    }
    if (dist >= WHITE_FEATHER) continue
    const alpha = (dist - WHITE_CUTOFF) / (WHITE_FEATHER - WHITE_CUTOFF)
    pixels[i + 3] = Math.round(alpha * 255)
  }
}

function paintFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): boolean {
  const cssSize = canvas.clientWidth
  if (cssSize === 0) return false
  const size = Math.round(cssSize * (window.devicePixelRatio || 1))
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size
    canvas.height = size
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return false
  const srcW = video.videoWidth
  const srcH = video.videoHeight
  if (srcW === 0 || srcH === 0) return false

  ctx.clearRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const maxSide = size * CLIP_SCALE
  const aspect = srcW / srcH
  const destW = aspect >= 1 ? maxSide : maxSide * aspect
  const destH = aspect >= 1 ? maxSide / aspect : maxSide
  ctx.drawImage(video, (size - destW) / 2, (size - destH) / 2, destW, destH)
  const frame = ctx.getImageData(0, 0, size, size)
  knockOutWhite(frame.data)
  ctx.putImageData(frame, 0, 0)
  return true
}

function drawFrame() {
  rafId = 0
  if (disposed || !acceptingPlayback) return
  const video = videoEl.value
  const canvas = canvasEl.value
  if (!video || !canvas || video.ended || video.paused) return
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    rafId = requestAnimationFrame(drawFrame)
    return
  }
  if (paintFrame(video, canvas)) {
    clipShowing.value = true
  }
  rafId = requestAnimationFrame(drawFrame)
}

function detachStart() {
  const video = videoEl.value
  if (video && startPlayback) {
    video.removeEventListener('canplay', startPlayback)
  }
  startPlayback = null
}

function releaseVideo(video: HTMLVideoElement) {
  detachStart()
  video.pause()
  video.removeAttribute('src')
}

function finishClip() {
  stopDrawing()
  clipShowing.value = false
  const video = videoEl.value
  if (video) releaseVideo(video)
}

function scheduleNextClip() {
  clearIdleTimer()
  if (disposed || prefersReducedMotion()) return
  idleTimer = setTimeout(() => {
    idleTimer = null
    playRandomClip()
  }, randomWaitMs())
}

function playRandomClip() {
  const video = videoEl.value
  if (!video || disposed || prefersReducedMotion()) return
  const next = CLIPS[Math.floor(Math.random() * CLIPS.length)]
  if (!next) return
  acceptingPlayback = true
  video.muted = true
  video.playsInline = true
  detachStart()
  const start = () => {
    detachStart()
    if (!acceptingPlayback || disposed) return
    void video.play().catch(() => {
      if (!acceptingPlayback) return
      acceptingPlayback = false
      finishClip()
      scheduleNextClip()
    })
  }
  startPlayback = start
  video.addEventListener('canplay', start)
  video.src = next
}

function onPlaying() {
  if (!acceptingPlayback) return
  stopDrawing()
  rafId = requestAnimationFrame(drawFrame)
}

function onClipEnded() {
  if (!acceptingPlayback) return
  acceptingPlayback = false
  finishClip()
  scheduleNextClip()
}

function onClipError() {
  if (!acceptingPlayback) return
  acceptingPlayback = false
  finishClip()
  scheduleNextClip()
}

onMounted(() => {
  scheduleNextClip()
})

onBeforeUnmount(() => {
  disposed = true
  acceptingPlayback = false
  clearIdleTimer()
  stopDrawing()
  detachStart()
  const video = videoEl.value
  if (video) {
    video.pause()
    video.removeAttribute('src')
  }
})
</script>

<template>
  <div
    class="relative size-20 shrink-0"
    aria-hidden="true"
  >
    <img
      :src="kolbeColorUrl"
      alt=""
      class="size-full object-contain"
      :class="clipShowing ? 'invisible' : ''"
    >
    <video
      ref="videoEl"
      class="pointer-events-none absolute inset-0 size-full opacity-0"
      muted
      playsinline
      preload="auto"
      @playing="onPlaying"
      @ended="onClipEnded"
      @error="onClipError"
    />
    <canvas
      ref="canvasEl"
      class="pointer-events-none absolute inset-0 size-full"
      :class="clipShowing ? '' : 'invisible'"
    />
  </div>
</template>
