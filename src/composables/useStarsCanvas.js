import { onMounted, onUnmounted, ref } from 'vue'

export function useStarsCanvas() {
  const starsCanvas = ref(null)
  let resizeRafId = 0

  function getStarsCount() {
    const area = window.innerWidth * window.innerHeight
    const isMobile = window.innerWidth <= 768
    const density = isMobile ? 1 / 9000 : 1 / 7000
    const baseCount = Math.round(area * density)
    return Math.max(120, Math.min(450, baseCount))
  }

  function drawStars() {
    const canvas = starsCanvas.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = window.innerWidth
    const height = window.innerHeight

    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const isLight = document.documentElement.classList.contains('light')
    const starsCount = getStarsCount()

    for (let i = 0; i < starsCount; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const r = isLight ? Math.random() * 2 + 0.5 : Math.random() * 2.2
      const alpha = isLight ? Math.random() * 0.6 + 0.4 : Math.random() * 0.7 + 0.1
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`
      ctx.fill()
    }
  }

  function handleResize() {
    if (resizeRafId) cancelAnimationFrame(resizeRafId)
    resizeRafId = requestAnimationFrame(() => {
      drawStars()
      resizeRafId = 0
    })
  }

  onMounted(() => {
    window.addEventListener('resize', handleResize)
    drawStars()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (resizeRafId) cancelAnimationFrame(resizeRafId)
  })

  return {
    starsCanvas,
    drawStars,
  }
}
