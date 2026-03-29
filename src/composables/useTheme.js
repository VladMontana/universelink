import { onMounted, ref } from 'vue'

export function useTheme(onThemeChange) {
  const isDark = ref(true)

  function applyThemeState() {
    document.documentElement.classList.toggle('light', !isDark.value)
  }

  function toggleTheme() {
    isDark.value = !isDark.value
    applyThemeState()
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    onThemeChange?.()
  }

  onMounted(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') isDark.value = false
    applyThemeState()
    onThemeChange?.()
  })

  return {
    isDark,
    toggleTheme,
  }
}
