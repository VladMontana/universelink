<template>
  <div class="app">
    <canvas ref="starsCanvas" class="stars-canvas" />

    <!-- ЭКРАН АВТОРИЗАЦИИ -->
    <transition name="fade">
      <div v-if="!isAuthenticated" class="auth-overlay">
        <div class="auth-box">
          <h1 class="logo" style="text-align:center; margin-bottom: 8px; font-size: clamp(28px, 8vw, 40px);">
            <span class="logo-light">Universe</span><span class="logo-bold">Link</span>
          </h1>
          <p class="tagline" style="text-align:center; margin-bottom: 28px;">
            {{ authMode === 'login' ? 'Войдите в аккаунт' : 'Создайте аккаунт' }}
          </p>

          <div class="modal-field">
            <label>Email</label>
            <input v-model="authForm.email" class="modal-input" type="email" placeholder="you@example.com" />
          </div>

          <div class="modal-field" style="margin-top: 14px;">
            <label>Пароль</label>
            <input v-model="authForm.password" class="modal-input" type="password" placeholder="••••••••" />
          </div>

          <p v-if="authError" class="auth-error">{{ authError }}</p>

          <button class="btn-create" style="width:100%; margin-top: 20px;" :disabled="authLoading" @click="submitAuth">
            {{ authLoading ? 'Подождите…' : (authMode === 'login' ? 'Войти' : 'Зарегистрироваться') }}
          </button>

          <p class="auth-switch">
            {{ authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?' }}
            <span @click="toggleAuthMode">{{ authMode === 'login' ? 'Зарегистрироваться' : 'Войти' }}</span>
          </p>
        </div>
      </div>
    </transition>

    <!-- ОСНОВНОЙ ИНТЕРФЕЙС -->
    <template v-if="isAuthenticated">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">История ссылок</span>
          <span class="sidebar-count">{{ links.length }}</span>
        </div>

        <div class="sidebar-list">
          <div v-if="links.length === 0" class="sidebar-empty">Пока нет ссылок</div>

          <div
            v-for="link in links"
            :key="link.id"
            class="sidebar-item"
            :class="{ active: selectedLink?.id === link.id }"
            @click="selectLink(link)"
          >
            <div class="sidebar-item-top">
              <span class="sidebar-short">{{ BASE_URL }}/{{ link.short_code }}</span>
              <span class="sidebar-date">{{ formatDate(link.created_at) }}</span>
            </div>
            <div class="sidebar-item-bottom">
              <span class="sidebar-original">{{ truncate(link.original_url) }}</span>
              <div class="sidebar-badges">
                <span v-if="link.max_clicks" class="badge badge-click">
                  {{ link.click_count }}/{{ link.max_clicks }}
                </span>
                <span v-if="link.expires_at" class="badge badge-time">
                  {{ formatExpiry(link.expires_at) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="sidebar-footer">
          <span class="user-email">{{ userEmail }}</span>
          <button class="logout-btn" @click="logout">Выйти</button>
        </div>
      </aside>

      <main class="main">
        <div class="logo-wrapper">
          <h1 class="logo">
            <span class="logo-light">Universe</span><span class="logo-bold">Link</span>
          </h1>
          <p class="tagline">Сервис по сокращению ссылок с аналитикой</p>
        </div>

        <div class="input-wrapper">
          <div class="glow-ring" />
          <input
            v-model="inputUrl"
            class="url-input"
            placeholder="Вставь длинную ссылку…"
            @keydown.enter="openModal"
          />
          <button class="shrink-btn" @click="openModal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <transition name="slide-up">
          <div v-if="selectedLink" class="link-detail">
            <div class="detail-top">
              <span class="detail-short">{{ BASE_URL }}/{{ selectedLink.short_code }}</span>
              <button class="close-btn" style="margin-left: auto; display: block;" @click="selectedLink = null">✕</button>
            </div>
            <div class="detail-actions">
              <button class="copy-btn" @click="copyLink(selectedLink.short_code)">
                {{ copied ? 'Скопировано!' : 'Копировать' }}
              </button>
              <button class="analytics-btn" @click="openAnalytics(selectedLink)">
                📊 Аналитика
              </button>
              <button class="edit-btn" @click="openEdit(selectedLink)">
                ✏️ Изменить
              </button>
              <button class="delete-btn" @click="deleteLink(selectedLink)">
                🗑
              </button>
            </div>
            <div class="detail-row">
              <span class="detail-label">Оригинал</span>
              <a :href="selectedLink.original_url" target="_blank" class="detail-url">
                {{ selectedLink.original_url }}
              </a>
            </div>
            <div class="detail-stats">
              <div class="stat">
                <span class="stat-val">{{ selectedLink.click_count }}</span>
                <span class="stat-label">переходов</span>
              </div>
              <div v-if="selectedLink.max_clicks" class="stat">
                <span class="stat-val">{{ selectedLink.max_clicks }}</span>
                <span class="stat-label">лимит</span>
              </div>
              <div v-if="selectedLink.expires_at" class="stat">
                <span class="stat-val">{{ formatExpiry(selectedLink.expires_at) }}</span>
                <span class="stat-label">истекает</span>
              </div>
            </div>
          </div>
        </transition>
      </main>
    </template>

    <!-- МОДАЛКА СОЗДАНИЯ ССЫЛКИ -->
    <transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal">
          <h2 class="modal-title">Новая ссылка</h2>

          <div class="modal-field">
            <label>URL</label>
            <input v-model="form.url" class="modal-input" placeholder="https://..." />
          </div>

          <div class="modal-field">
            <label>Свой код <span class="optional">необязательно</span></label>
            <input v-model="form.customCode" class="modal-input" placeholder="my-link" maxlength="20" />
          </div>

          <div class="modal-row">
            <div class="modal-field">
              <label>Лимит переходов</label>
              <input v-model.number="form.maxClicks" class="modal-input" type="number" min="1" placeholder="∞" />
            </div>
            <div class="modal-field">
              <label>Истекает</label>
              <input v-model="form.expiresAt" class="modal-input" type="datetime-local" />
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="showModal = false">Отмена</button>
            <button class="btn-create" :disabled="loading" @click="createLink">
              {{ loading ? 'Создаём…' : 'Сократить' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- МОДАЛКА РЕДАКТИРОВАНИЯ -->
    <transition name="fade">
      <div v-if="showEdit" class="modal-overlay" @click.self="showEdit = false">
        <div class="modal">
          <h2 class="modal-title">Редактировать ссылку</h2>

          <div class="modal-field">
            <label>Свой код</label>
            <input v-model="editForm.custom_code" class="modal-input" placeholder="my-link" maxlength="20" />
          </div>

          <div class="modal-row">
            <div class="modal-field">
              <label>Лимит переходов</label>
              <input v-model.number="editForm.max_clicks" class="modal-input" type="number" min="1" placeholder="∞" />
            </div>
            <div class="modal-field">
              <label>Истекает</label>
              <input v-model="editForm.expires_at" class="modal-input" type="datetime-local" />
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="showEdit = false">Отмена</button>
            <button class="btn-create" :disabled="editLoading" @click="submitEdit">
              {{ editLoading ? 'Сохраняем…' : 'Сохранить' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- МОДАЛКА АНАЛИТИКИ -->
    <transition name="fade">
      <div v-if="showAnalytics" class="modal-overlay" @click.self="closeAnalytics">
        <div class="modal analytics-modal">
          <div class="analytics-header">
            <div>
              <h2 class="modal-title">Аналитика</h2>
              <span class="analytics-code">{{ BASE_URL }}/{{ analyticsLink?.short_code }}</span>
            </div>
            <button class="close-btn" @click="closeAnalytics">✕</button>
          </div>

          <div v-if="analyticsLoading" class="analytics-loading">Загружаем данные…</div>

          <template v-else-if="analyticsData">
            <div class="analytics-stats">
              <div class="analytics-stat">
                <span class="analytics-stat-val">{{ analyticsData.total_clicks }}</span>
                <span class="analytics-stat-label">Всего переходов</span>
              </div>
              <div v-if="analyticsLink?.max_clicks" class="analytics-stat">
                <span class="analytics-stat-val">{{ analyticsLink.max_clicks - analyticsData.total_clicks }}</span>
                <span class="analytics-stat-label">Осталось</span>
              </div>
              <div v-if="analyticsLink?.expires_at" class="analytics-stat">
                <span class="analytics-stat-val">{{ formatExpiry(analyticsLink.expires_at) }}</span>
                <span class="analytics-stat-label">Истекает</span>
              </div>
            </div>

            <div class="analytics-clicks-header">
              <span>Последние переходы</span>
              <span class="analytics-clicks-count">{{ analyticsData.clicks.length }}</span>
            </div>

            <div class="analytics-clicks-list">
              <div v-if="analyticsData.clicks.length === 0" class="analytics-empty">
                Переходов пока нет
              </div>
              <div
                v-for="(click, i) in analyticsData.clicks"
                :key="i"
                class="analytics-click-item"
              >
                <div class="click-icon">→</div>
                <div class="click-info">
                  <span class="click-agent">{{ truncateAgent(click.user_agent) }}</span>
                  <span class="click-ip">{{ click.ip_address || 'неизвестно' }}</span>
                </div>
                <span class="click-time">{{ formatClickTime(click.clicked_at) }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const BASE_URL = 'http://localhost:8000'
const API = BASE_URL

// --- Auth state ---
const token       = ref(localStorage.getItem('token') || '')
const userEmail   = ref(localStorage.getItem('userEmail') || '')
const authMode    = ref('login')
const authLoading = ref(false)
const authError   = ref('')
const authForm    = ref({ email: '', password: '' })

const isAuthenticated = computed(() => !!token.value)

// --- App state ---
const starsCanvas  = ref(null)
const links        = ref([])
const selectedLink = ref(null)
const inputUrl     = ref('')
const showModal    = ref(false)
const loading      = ref(false)
const copied       = ref(false)

const form = ref({ url: '', customCode: '', maxClicks: null, expiresAt: '' })

// --- Analytics state ---
const showAnalytics    = ref(false)
const analyticsLink    = ref(null)
const analyticsData    = ref(null)
const analyticsLoading = ref(false)

onMounted(() => {
  drawStars()
  if (isAuthenticated.value) fetchLinks()
})

// --- Stars ---
function drawStars() {
  const canvas = starsCanvas.value
  const ctx = canvas.getContext('2d')
  const resize = () => {
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const r = Math.random() * 1.2
      const alpha = Math.random() * 0.7 + 0.1
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`
      ctx.fill()
    }
  }
  resize()
  window.addEventListener('resize', resize)
}

// --- Auth ---
function toggleAuthMode() {
  authMode.value = authMode.value === 'login' ? 'register' : 'login'
  authError.value = ''
}

async function submitAuth() {
  authError.value = ''
  authLoading.value = true
  try {
    if (authMode.value === 'register') {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.value.email, password: authForm.value.password }),
      })
      if (!res.ok) {
        const err = await res.json()
        authError.value = err.detail?.[0]?.msg || err.detail || 'Ошибка регистрации'
        return
      }
      authMode.value = 'login'
    }

    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authForm.value.email, password: authForm.value.password }),
    })

    if (!res.ok) {
      const err = await res.json()
      authError.value = err.detail || 'Неверный email или пароль'
      return
    }

    const data = await res.json()
    token.value = data.access_token
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('userEmail', authForm.value.email)
    userEmail.value = authForm.value.email
    authForm.value = { email: '', password: '' }
    await fetchLinks()
  } catch {
    authError.value = 'Ошибка соединения с сервером'
  } finally {
    authLoading.value = false
  }
}

function logout() {
  token.value = ''
  userEmail.value = ''
  links.value = []
  selectedLink.value = null
  localStorage.removeItem('token')
  localStorage.removeItem('userEmail')
}

// --- API ---
async function fetchLinks() {
  try {
    const res = await fetch(`${API}/links`, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    if (res.status === 401) { logout(); return }
    if (res.ok) links.value = await res.json()
  } catch (e) {
    console.error(e)
  }
}

async function createLink() {
  if (!form.value.url) return
  loading.value = true
  try {
    const body = {
      original_url: form.value.url,
      ...(form.value.customCode && { custom_code: form.value.customCode }),
      ...(form.value.maxClicks  && { max_clicks: form.value.maxClicks }),
      ...(form.value.expiresAt  && { expires_at: new Date(form.value.expiresAt).toISOString() }),
    }

    const res = await fetch(`${API}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(body),
    })

    if (res.status === 401) { logout(); return }
    if (res.ok) {
      const newLink = await res.json()
      links.value.unshift(newLink)
      selectedLink.value = newLink
      showModal.value = false
      resetForm()
    }
  } finally {
    loading.value = false
  }
}

// --- Analytics ---
async function openAnalytics(link) {
  analyticsLink.value = link
  analyticsData.value = null
  analyticsLoading.value = true
  showAnalytics.value = true

  try {
    const res = await fetch(`${API}/links/${link.short_code}/stats`, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    if (res.ok) analyticsData.value = await res.json()
  } catch (e) {
    console.error(e)
  } finally {
    analyticsLoading.value = false
  }
}

function closeAnalytics() {
  showAnalytics.value = false
  analyticsData.value = null
  analyticsLink.value = null
}

// --- Edit ---
const showEdit   = ref(false)
const editLoading = ref(false)
const editLink   = ref(null)
const editForm   = ref({ custom_code: '', max_clicks: null, expires_at: '' })

function openEdit(link) {
  editLink.value = link
  editForm.value = {
    custom_code: link.short_code,
    max_clicks: link.max_clicks || null,
    expires_at: link.expires_at ? new Date(link.expires_at).toISOString().slice(0, 16) : '',
  }
  showEdit.value = true
}

async function submitEdit() {
  editLoading.value = true
  try {
    const body = {}
    if (editForm.value.custom_code)  body.custom_code = editForm.value.custom_code
    if (editForm.value.max_clicks)   body.max_clicks  = editForm.value.max_clicks
    if (editForm.value.expires_at)   body.expires_at  = new Date(editForm.value.expires_at).toISOString()

    const res = await fetch(`${API}/links/${editLink.value.short_code}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      await fetchLinks()
      showEdit.value = false
      selectedLink.value = null
    }
  } finally {
    editLoading.value = false
  }
}

// --- Delete ---
async function deleteLink(link) {
  if (!confirm(`Удалить ссылку ${link.short_code}?`)) return

  const res = await fetch(`${API}/links/${link.short_code}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token.value}` },
  })

  if (res.ok || res.status === 204) {
    links.value = links.value.filter(l => l.id !== link.id)
    selectedLink.value = null
  }
}

// --- Helpers ---
function openModal() {
  form.value.url = inputUrl.value
  showModal.value = true
}

function selectLink(link) {
  selectedLink.value = selectedLink.value?.id === link.id ? null : link
}

async function copyLink(code) {
  await navigator.clipboard.writeText(`${BASE_URL}/${code}`)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

function resetForm() {
  form.value = { url: '', customCode: '', maxClicks: null, expiresAt: '' }
  inputUrl.value = ''
}

function truncate(str, n = 38) {
  return str.length > n ? str.slice(0, n) + '…' : str
}

function truncateAgent(agent) {
  if (!agent) return 'Неизвестный браузер'
  if (agent.includes('Chrome')) return 'Chrome'
  if (agent.includes('Firefox')) return 'Firefox'
  if (agent.includes('Safari')) return 'Safari'
  if (agent.includes('Edge')) return 'Edge'
  return agent.slice(0, 30) + '…'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

function formatExpiry(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = d - now
  if (diff < 0) return 'истекла'
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}д`
  const hours = Math.floor(diff / 3600000)
  return `${hours}ч`
}

function formatClickTime(iso) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:      #0b0f1a;
  --bg2:     #0f1525;
  --bg3:     #141b2d;
  --border:  rgba(255,255,255,0.07);
  --purple:  #7c3aed;
  --purple2: #a855f7;
  --glow:    rgba(124, 58, 237, 0.5);
  --text:    #e2e8f0;
  --muted:   #64748b;
  --font:    'Syne', sans-serif;
  --mono:    'JetBrains Mono', monospace;
}

html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font); overflow: hidden; }

.app { 
  display: flex; 
  height: 100vh; 
  position: relative; 
  overflow: hidden; 
}

.stars-canvas { 
  position: fixed; 
  inset: 0; 
  pointer-events: none; 
  z-index: 0; 
}

/* AUTH */
.auth-overlay {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(11, 15, 26, 0.85); backdrop-filter: blur(8px);
}
.auth-box { 
  background: var(--bg2); 
  border: 1px solid var(--border); 
  border-radius: 20px; 
  padding: 36px; 
  width: 100%; 
  max-width: 400px; 
}

.auth-error { 
  margin-top: 10px; 
  font-size: 12px; 
  color: #f87171; 
  font-family: var(--mono); 
}

.auth-switch { 
  text-align: center; 
  margin-top: 16px; 
  font-size: 12px; 
  color: var(--muted); 
}

.auth-switch span { 
  color: var(--purple2); 
  cursor: pointer; 
  margin-left: 4px; 
  text-decoration: underline; 
}

/* SIDEBAR */
.sidebar {
  position: relative; 
  z-index: 10; 
  width: 280px; 
  flex-shrink: 0;
  background: rgba(11, 15, 26, 0.85); 
  border-right: 1px solid var(--border);
  backdrop-filter: blur(12px); 
  display: flex; 
  flex-direction: column; 
  overflow: hidden;
}


.sidebar-header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  padding: 24px 20px 16px; 
  border-bottom: 1px solid var(--border); 
}

.sidebar-title { 
  font-size: 11px; 
  font-weight: 700; 
  letter-spacing: 0.12em; 
  text-transform: uppercase; 
  color: var(--muted); 
}

.sidebar-count { 
  font-size: 11px; 
  background: var(--bg3); 
  color: var(--muted); 
  border-radius: 20px; 
  padding: 2px 8px; 
  font-family: var(--mono); 
}

.sidebar-list { 
  flex: 1; 
  overflow-y: auto; 
  padding: 8px; 
  scrollbar-width: thin; 
  scrollbar-color: var(--bg3) transparent; 
}


.sidebar-empty { 
  text-align: center; 
  padding: 40px 20px; 
  color: var(--muted); 
  font-size: 13px; 
}

.sidebar-item { 
  padding: 12px; 
  border-radius: 10px; 
  cursor: pointer; 
  transition: background 0.15s; 
  margin-bottom: 4px; 
  border: 1px solid transparent; 
}

.sidebar-item:hover { background: var(--bg3); }
.sidebar-item.active { 
  background: rgba(124,58,237,0.15); 
  border-color: rgba(124,58,237,0.25); 
}

.sidebar-item-top { 
  display: flex; 
  flex-direction: column; 
  gap: 3px; 
  margin-bottom: 6px; 
}

.sidebar-short { 
  font-family: var(--mono); 
  font-size: 12px; 
  color: var(--purple2); 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
}

.sidebar-date { 
  font-size: 10px; 
  color: var(--muted); 
}

.sidebar-item-bottom { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  gap: 8px; 
}

.sidebar-original { 
  font-size: 11px; 
  color: var(--muted); 
  flex: 1; 
  min-width: 0; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
}

.sidebar-badges { 
  display: flex; 
  gap: 4px; 
  flex-shrink: 0; 
}

.badge { 
  font-size: 10px; 
  font-family: var(--mono); 
  padding: 1px 6px; 
  border-radius: 4px; 
}

.badge-click { 
  background: rgba(124,58,237,0.2); 
  color: var(--purple2); 
}

.badge-time  { 
  background: rgba(234,179,8,0.15); 
  color: #fbbf24; 
}

.sidebar-footer { 
  padding: 14px 16px; 
  border-top: 1px solid var(--border); 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  gap: 8px; 
}

.user-email { 
  font-size: 11px; 
  color: var(--muted); 
  font-family: var(--mono); 
  overflow: hidden; 
  text-overflow: ellipsis; 
  white-space: nowrap; 
}

.logout-btn { 
  font-size: 11px; 
  padding: 4px 10px; 
  background: none; 
  border: 1px solid var(--border); 
  border-radius: 6px; 
  color: var(--muted); 
  cursor: pointer; 
  transition: color 0.15s, 
  border-color 0.15s; 
  flex-shrink: 0; 
  font-family: var(--font); 
}

.logout-btn:hover { 
  color: #f87171; 
  border-color: rgba(248,113,113,0.3); 
}

/* MAIN */
.main { 
  flex: 1; 
  position: relative; 
  z-index: 10; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  padding: 40px; gap: 32px; 
}

.logo-wrapper { text-align: center; }
.logo { 
  font-size: clamp(36px, 5vw, 56px); 
  font-weight: 800; 
  letter-spacing: -0.02em; 
  line-height: 1; 
  margin-bottom: 12px; 
}

.logo-light { 
  font-weight: 400; 
  color: var(--text); 
}

.logo-bold  { 
  font-weight: 800; 
  color: #fff; 
}

.tagline { 
  font-size: 13px; 
  color: var(--muted); 
  letter-spacing: 0.05em; 
  font-family: var(--mono); 
}

.input-wrapper { 
  position: relative; 
  width: 100%; 
  max-width: 620px; 
}

.glow-ring { 
  position: absolute; 
  inset: -2px; 
  border-radius: 18px; 
  background: linear-gradient(135deg, var(--purple), var(--purple2), #ec4899); 
  opacity: 0.7; 
  filter: blur(8px); 
  z-index: 0; 
  transition: opacity 0.3s; 
}
.input-wrapper:focus-within .glow-ring { opacity: 1; filter: blur(12px); }
.url-input { 
  position: relative; 
  z-index: 1; 
  width: 100%; 
  padding: 18px 56px 18px 24px; 
  background: rgba(15, 21, 37, 0.95); 
  border: 1px solid rgba(124,58,237,0.3); 
  border-radius: 16px; color: var(--text); 
  font-family: var(--mono); 
  font-size: 14px; 
  outline: none; 
  transition: border-color 0.2s; 
}

.url-input::placeholder { color: var(--muted); }
.url-input:focus { border-color: rgba(124,58,237,0.7); }
.shrink-btn { 
  position: absolute; 
  right: 12px; top: 50%; 
  transform: translateY(-50%); z-index: 2; 
  width: 36px; height: 36px; 
  background: linear-gradient(135deg, var(--purple), var(--purple2)); 
  border: none; 
  border-radius: 10px; 
  color: #fff; cursor: pointer; display: flex; align-items: center; 
  justify-content: center; transition: opacity 0.2s, transform 0.15s; 
}

.shrink-btn:hover { opacity: 0.85; transform: translateY(-50%) scale(1.05); }

.link-detail { 
  width: 100%; max-width: 620px; 
  background: rgba(15, 21, 37, 0.9); 
  border: 1px solid var(--border); border-radius: 16px; 
  padding: 20px 24px; backdrop-filter: blur(12px); 
}

.detail-top { 
  display: flex; align-items: flex-start; 
  justify-content: space-between; 
  margin-bottom: 8px; gap: 8px; 
}
.detail-short { 
  font-family: var(--mono); font-size: 14px; 
  color: var(--purple2); word-break: break-all; 
  display: block; 
}

.detail-actions { 
  display: flex; align-items: center; 
  gap: 8px; margin-bottom: 14px; flex-wrap: wrap; 
}

.copy-btn { 
  font-size: 12px; padding: 5px 12px; 
  background: rgba(124,58,237,0.2); border: 1px solid rgba(124,58,237,0.3); 
  border-radius: 8px; color: var(--purple2); cursor: pointer; transition: background 0.15s; 
  font-family: var(--font); white-space: nowrap; 
}

.copy-btn:hover { background: rgba(124,58,237,0.35); }

.analytics-btn { 
  font-size: 12px; padding: 5px 12px; 
  background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); 
  border-radius: 8px; color: #34d399; cursor: pointer; transition: background 0.15s; 
  font-family: var(--font); white-space: nowrap; 
}

.analytics-btn:hover { background: rgba(16,185,129,0.2); }

.edit-btn { 
  font-size: 12px; padding: 5px 12px; 
  background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); 
  border-radius: 8px; color: #fbbf24; cursor: pointer; 
  transition: background 0.15s; font-family: var(--font); white-space: nowrap; 
}

.edit-btn:hover { background: rgba(251,191,36,0.2); }

.delete-btn { 
  font-size: 14px; padding: 5px 10px; 
  background: rgba(248,113,113,0.1); 
  border: 1px solid rgba(248,113,113,0.25); 
  border-radius: 8px; color: #f87171; cursor: pointer; 
  transition: background 0.15s; 
}

.delete-btn:hover { background: rgba(248,113,113,0.2); }

.close-btn { 
  background: none; border: none; 
  color: var(--muted); cursor: pointer; 
  font-size: 14px; padding: 4px; transition: color 0.15s; 
}

.close-btn:hover { color: var(--text); }

.detail-row { 
  display: flex; 
  gap: 12px; 
  margin-bottom: 16px; 
  align-items: baseline; 
}

.detail-label { 
  font-size: 11px; 
  text-transform: uppercase; 
  letter-spacing: 0.1em; 
  color: var(--muted); 
  flex-shrink: 0; 
  font-family: var(--mono); 
}

.detail-url { 
  font-size: 12px; 
  color: var(--muted); 
  text-decoration: none; 
  word-break: break-all; 
  line-height: 1.5; 
  transition: color 0.15s; 
}

.detail-url:hover { color: var(--text); }

.detail-stats { 
  display: flex; 
  gap: 24px; 
}


.stat { 
  display: flex; 
  flex-direction: column; 
  gap: 2px; 
}

.stat-val { 
  font-family: var(--mono); 
  font-size: 18px; 
  font-weight: 700; 
  color: #fff; 
}

.stat-label { 
  font-size: 11px; 
  color: var(--muted); 
  text-transform: uppercase; 
  letter-spacing: 0.08em; 
}

/* MODAL */
.modal-overlay { 
  position: fixed; 
  inset: 0; 
  background: rgba(0,0,0,0.6); 
  backdrop-filter: blur(4px); 
  z-index: 100; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}

.modal { 
  background: var(--bg2); 
  border: 1px solid var(--border); 
  border-radius: 20px; 
  padding: 32px; 
  width: 100%; 
  max-width: 460px; 
  display: flex; 
  flex-direction: column; gap: 20px; }
.modal-title { 
  font-size: 18px; 
  font-weight: 700; 
}

.modal-field { 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
  flex: 1; 
}

.modal-field label { 
  font-size: 11px; 
  text-transform: uppercase; 
  letter-spacing: 0.1em; 
  color: var(--muted); 
  font-family: var(--mono); 
}

.optional { 
  text-transform: none; 
  letter-spacing: 0; 
  font-size: 10px; 
  color: var(--muted); 
}

.modal-input { 
  background: var(--bg3); 
  border: 1px solid var(--border); 
  border-radius: 10px; 
  padding: 10px 14px; 
  color: var(--text); 
  font-family: var(--mono); 
  font-size: 13px; outline: none; 
  transition: border-color 0.2s; width: 100%; 
}

.modal-input:focus { border-color: rgba(124,58,237,0.5); }
.modal-input::-webkit-calendar-picker-indicator { filter: invert(0.5); }
.modal-row { 
  display: flex; 
  gap: 16px; 
  overflow: hidden; 
}

.modal-row .modal-field { min-width: 0; }
.modal-actions { 
  display: flex; 
  justify-content: flex-end; 
  gap: 10px; 
  padding-top: 4px; 
}

.btn-cancel { 
  padding: 10px 20px; 
  background: none; 
  border: 1px solid var(--border); 
  border-radius: 10px; 
  color: var(--muted); 
  cursor: pointer; 
  font-family: var(--font); font-size: 13px; 
  transition: border-color 0.15s, color 0.15s; 
}

.btn-cancel:hover { 
  border-color: rgba(255,255,255,0.2); 
  color: var(--text); 
}

.btn-create { 
  padding: 10px 24px; 
  background: linear-gradient(135deg, var(--purple), var(--purple2)); 
  border: none; 
  border-radius: 10px; 
  color: #fff; 
  cursor: pointer; 
  font-family: var(--font); 
  font-size: 13px; 
  font-weight: 700; 
  transition: opacity 0.15s; 
}

.btn-create:hover { opacity: 0.85; }
.btn-create:disabled { 
  opacity: 0.5; 
  cursor: not-allowed; 
}


/* ANALYTICS MODAL */
.analytics-modal { 
  max-width: 520px; 
  max-height: 80vh; 
  overflow: hidden; 
  display: flex; 
  flex-direction: column; 
  gap: 0; 
  padding: 0; 
}

.analytics-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start; 
  padding: 24px 28px 20px; 
  border-bottom: 1px solid var(--border); 
}

.analytics-code { 
  font-family: var(--mono); 
  font-size: 11px; 
  color: var(--purple2); 
  margin-top: 4px; 
  display: block; 
}

.analytics-loading { 
  padding: 40px; 
  text-align: center; 
  color: var(--muted); 
  font-family: var(--mono); 
  font-size: 13px; 
}

.analytics-stats { 
  display: flex; 
  border-bottom: 1px solid var(--border); 
}

.analytics-stat { 
  flex: 1; 
  padding: 20px 28px; 
  border-right: 1px solid var(--border); 
  display: flex; 
  flex-direction: column; gap: 4px; 
}

.analytics-stat:last-child { border-right: none; }
.analytics-stat-val { 
  font-family: var(--mono); 
  font-size: 28px; 
  font-weight: 700; 
  color: #fff; 
}

.analytics-stat-label { 
  font-size: 11px; 
  color: var(--muted); 
  text-transform: uppercase; 
  letter-spacing: 0.08em; 
}

.analytics-clicks-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 16px 28px 12px; 
  font-size: 12px; 
  color: var(--muted); 
  font-family: var(--mono); 
  text-transform: uppercase; 
  letter-spacing: 0.1em; 
}

.analytics-clicks-count { 
  background: var(--bg3); 
  border-radius: 20px; 
  padding: 2px 8px; 
  font-size: 11px; 
}

.analytics-clicks-list { 
  overflow-y: auto; 
  flex: 1; 
  scrollbar-width: thin; 
  scrollbar-color: var(--bg3) transparent; 
  padding: 0 16px 16px; 
}

.analytics-empty { 
  text-align: center; 
  padding: 32px; 
  color: var(--muted); 
  font-size: 13px; 
  font-family: var(--mono); 
}

.analytics-click-item { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  padding: 10px 12px; 
  border-radius: 8px; 
  margin-bottom: 4px; 
  transition: background 0.15s;
}

.analytics-click-item:hover { background: var(--bg3); }
.click-icon { 
  font-size: 12px; 
  color: var(--purple2); 
  flex-shrink: 0; 
}

.click-info { 
  flex: 1; 
  min-width: 0; 
  display: flex; 
  flex-direction: column; 
  gap: 2px; 
}


.click-agent { 
  font-size: 12px; 
  color: var(--text); 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
}

.click-ip { 
  font-size: 11px; 
  color: var(--muted); 
  font-family: var(--mono); 
}

.click-time { 
  font-size: 11px; 
  color: var(--muted); 
  font-family: var(--mono); 
  flex-shrink: 0; 
}

/* TRANSITIONS */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-up-enter-active, .slide-up-leave-active { 
  transition: opacity 0.25s, 
  transform 0.25s; 
}
.slide-up-enter-from, .slide-up-leave-to { 
  opacity: 0; 

  transform: translateY(12px); 
}

</style>