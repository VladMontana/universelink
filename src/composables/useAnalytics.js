import { onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { fetchLinkStatsRequest } from '../services/analyticsApi'

const ANALYTICS_CACHE_TTL_MS = 60_000

export function useAnalytics({ apiUrl, token, onUnauthorized }) {
  const showAnalytics = ref(false)
  /** @type {import('vue').Ref<import('../types/models').Link | null>} */
  const analyticsLink = ref(null)
  /** @type {import('vue').Ref<import('../types/models').AnalyticsData | null>} */
  const analyticsData = ref(null)
  const analyticsLoading = ref(false)

  let analyticsAbortController = null
  const analyticsCache = new Map()

  onUnmounted(() => {
    if (analyticsAbortController) analyticsAbortController.abort()
  })

  async function openAnalytics(link) {
    if (analyticsAbortController) analyticsAbortController.abort()
    analyticsAbortController = new AbortController()

    const cacheKey = link.short_code
    const cached = analyticsCache.get(cacheKey)
    analyticsLink.value = link
    showAnalytics.value = true

    if (cached && Date.now() - cached.timestamp < ANALYTICS_CACHE_TTL_MS) {
      analyticsData.value = cached.data
      analyticsLoading.value = false
      return
    }

    analyticsData.value = null
    analyticsLoading.value = true

    try {
      const { response, data } = await fetchLinkStatsRequest(
        apiUrl,
        token.value,
        link.short_code,
        analyticsAbortController.signal
      )

      if (response.status === 401) {
        closeAnalytics()
        onUnauthorized?.()
        toast.error('Сессия истекла. Войдите снова.')
        return
      }

      if (response.ok) {
        analyticsData.value = data
        analyticsCache.set(cacheKey, {
          data: analyticsData.value,
          timestamp: Date.now(),
        })
        return
      }

      toast.error('Не удалось загрузить аналитику.')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      console.error(e)
      toast.error('Ошибка сети при загрузке аналитики.')
    } finally {
      analyticsLoading.value = false
      analyticsAbortController = null
    }
  }

  function closeAnalytics() {
    if (analyticsAbortController) analyticsAbortController.abort()
    showAnalytics.value = false
    analyticsData.value = null
    analyticsLink.value = null
  }

  function clearAnalyticsCache() {
    analyticsCache.clear()
  }

  function removeCachedLinkStats(shortCode) {
    analyticsCache.delete(shortCode)
  }

  return {
    showAnalytics,
    analyticsLink,
    analyticsData,
    analyticsLoading,
    openAnalytics,
    closeAnalytics,
    clearAnalyticsCache,
    removeCachedLinkStats,
  }
}
