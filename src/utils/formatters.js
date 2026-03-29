export function truncate(str, n = 38) {
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function truncateAgent(agent) {
  if (!agent) return 'Неизвестный браузер'
  if (agent.includes('Chrome')) return 'Chrome'
  if (agent.includes('Firefox')) return 'Firefox'
  if (agent.includes('Safari')) return 'Safari'
  if (agent.includes('Edge')) return 'Edge'
  return agent.slice(0, 30) + '…'
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

export function formatExpiry(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = d - now
  if (diff < 0) return 'истекла'
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}д`
  const hours = Math.floor(diff / 3600000)
  return `${hours}ч`
}

export function formatClickTime(iso) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
