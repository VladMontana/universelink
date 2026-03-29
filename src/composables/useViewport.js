import { onMounted, onUnmounted, ref } from 'vue'

const MOBILE_QUERY = '(max-width: 768px)'

export function useViewport(sidebarOpen) {
  const isMobileViewport = ref(false)
  let mediaQueryList = null

  function syncViewportFlags() {
    if (!mediaQueryList) return
    isMobileViewport.value = mediaQueryList.matches
    if (!mediaQueryList.matches) sidebarOpen.value = false
  }

  onMounted(() => {
    mediaQueryList = window.matchMedia(MOBILE_QUERY)
    syncViewportFlags()
    mediaQueryList.addEventListener('change', syncViewportFlags)
  })

  onUnmounted(() => {
    if (mediaQueryList) mediaQueryList.removeEventListener('change', syncViewportFlags)
  })

  return {
    isMobileViewport,
  }
}
