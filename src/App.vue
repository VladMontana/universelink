<template>
  <div
    ref="appRoot"
    class="app"
    :class="{
      'sidebar-active': isMobileViewport && sidebarOpen,
      'mobile-overlay-active': isMobileViewport && (sidebarOpen || showModal || showEdit || showAnalytics)
    }"
  >
    <canvas ref="starsCanvas" class="stars-canvas" />

    <transition name="fade">
      <AuthOverlay
        v-if="!isAuthenticated"
        :auth-mode="authMode"
        :auth-loading="authLoading"
        :auth-error="authError"
        :email="authForm.email"
        :password="authForm.password"
        :email-error="authFieldErrors.email"
        :password-error="authFieldErrors.password"
        @update:email="updateAuthEmail"
        @update:password="updateAuthPassword"
        @toggle-mode="toggleAuthMode"
        @submit="submitAuth"
      />
    </transition>

    <template v-if="isAuthenticated">
      <button
        class="burger-btn"
        :class="{ open: sidebarOpen }"
        :aria-label="sidebarOpen ? 'Закрыть меню' : 'Открыть меню'"
        @click="sidebarOpen = !sidebarOpen"
      >
        <X v-if="sidebarOpen" :size="18" aria-hidden="true" />
        <Menu v-else :size="18" aria-hidden="true" />
      </button>
      <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" />

      <SidebarPanel
        :links="links"
        :selected-link-id="selectedLink?.id ?? null"
        :base-url="BASE_URL"
        :user-email="userEmail"
        :is-dark="isDark"
        :sidebar-open="sidebarOpen"
        :format-date="formatDate"
        :format-expiry="formatExpiry"
        :truncate="truncate"
        @select-link="selectLink"
        @toggle-theme="toggleTheme"
        @logout="logout"
      />

      <main class="main">
        <div class="logo-wrapper">
          <h1 class="logo">
            <span class="logo-light">Universe</span><span class="logo-bold">Link</span>
          </h1>
          <p class="tagline">Вся вселенная в одной ссылке.</p>
        </div>

        <div ref="inputWrapper" class="input-wrapper">
          <div class="glow-ring" />
          <input
            v-model="inputUrl"
            class="url-input"
            aria-label="Длинная ссылка"
            placeholder="Вставь длинную ссылку…"
            @keydown.enter="openModal"
          />
          <button class="shrink-btn" aria-label="Открыть форму сокращения" @click="openModal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <transition name="slide-up" mode="out-in">
          <LinkDetailCard
            v-if="selectedLink"
            :link="selectedLink"
            :base-url="BASE_URL"
            :copied="copied"
            :format-expiry="formatExpiry"
            @close="selectedLink = null"
            @copy="copyLink"
            @open-analytics="openAnalytics"
            @open-edit="openEdit"
            @delete-link="deleteLink"
          />
        </transition>
      </main>
    </template>

    <transition name="fade">
      <CreateLinkModal
        v-if="showModal"
        :form="form"
        :error="error"
        :loading="loading"
        @close="closeCreateModal"
        @submit="createLink"
      />
    </transition>

    <transition name="fade">
      <EditLinkModal
        v-if="showEdit"
        :edit-form="editForm"
        :edit-loading="editLoading"
        @close="closeEditModal"
        @submit="submitEdit"
      />
    </transition>

    <transition name="fade">
      <AnalyticsModal
        v-if="showAnalytics"
        :base-url="BASE_URL"
        :analytics-link="analyticsLink"
        :analytics-data="analyticsData"
        :analytics-loading="analyticsLoading"
        :format-expiry="formatExpiry"
        :truncate-agent="truncateAgent"
        :format-click-time="formatClickTime"
        @close="closeAnalytics"
      />
    </transition>

    <Toaster rich-colors position="top-right" />
  </div>
</template>

<script setup>
import { defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue'
import { Menu, X } from 'lucide-vue-next'
import { Toaster } from 'vue-sonner'
import AuthOverlay from './components/AuthOverlay.vue'
import LinkDetailCard from './components/LinkDetailCard.vue'
import SidebarPanel from './components/SidebarPanel.vue'
import { useAnalytics } from './composables/useAnalytics'
import { useAuth } from './composables/useAuth'
import { useLinks } from './composables/useLinks'
import { useStarsCanvas } from './composables/useStarsCanvas'
import { useTheme } from './composables/useTheme'
import { useViewport } from './composables/useViewport'
import {
  formatClickTime,
  formatDate,
  formatExpiry,
  truncate,
  truncateAgent,
} from './utils/formatters'

const CreateLinkModal = defineAsyncComponent(() => import('./components/CreateLinkModal.vue'))
const EditLinkModal = defineAsyncComponent(() => import('./components/EditLinkModal.vue'))
const AnalyticsModal = defineAsyncComponent(() => import('./components/AnalyticsModal.vue'))

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const BASE_URL = (import.meta.env.VITE_BASE_URL || API).replace(/\/$/, '')

const sidebarOpen = ref(false)
const appRoot = ref(null)
const inputWrapper = ref(null)
const { starsCanvas, drawStars } = useStarsCanvas()
const { isDark, toggleTheme } = useTheme(drawStars)
const { isMobileViewport } = useViewport(sidebarOpen)

let fetchLinks = async () => {}

const {
  token,
  userEmail,
  authMode,
  authLoading,
  authError,
  authForm,
  authFieldErrors,
  isAuthenticated,
  toggleAuthMode,
  updateAuthEmail,
  updateAuthPassword,
  submitAuth,
  logout,
} = useAuth({
  apiUrl: API,
  onAuthenticated: () => fetchLinks(),
  onLogout: handleLogoutCleanup,
})

const {
  showAnalytics,
  analyticsLink,
  analyticsData,
  analyticsLoading,
  openAnalytics,
  closeAnalytics,
  clearAnalyticsCache,
  removeCachedLinkStats,
} = useAnalytics({
  apiUrl: API,
  token,
  onUnauthorized: () => logout(),
})

const {
  links,
  selectedLink,
  inputUrl,
  showModal,
  loading,
  copied,
  error,
  form,
  showEdit,
  editLoading,
  editForm,
  fetchLinks: fetchLinksFromApi,
  createLink,
  closeCreateModal,
  closeEditModal,
  openModal: openCreateModal,
  selectLink: selectLinkFromList,
  openEdit,
  submitEdit: submitEditLink,
  deleteLink: deleteLinkByCode,
  copyLink,
  clearLinksState,
} = useLinks({
  apiUrl: API,
  baseUrl: BASE_URL,
  token,
  onUnauthorized: () => logout(),
})

fetchLinks = fetchLinksFromApi

onMounted(() => {
  if (isAuthenticated.value) fetchLinks()
})

function handleLogoutCleanup() {
  clearLinksState()
  clearAnalyticsCache()
  sidebarOpen.value = false
}

watch([showModal, showEdit, showAnalytics], ([createOpen, editOpen, analyticsOpen]) => {
  if (createOpen || editOpen || analyticsOpen) {
    sidebarOpen.value = false
  }
})

watch(selectedLink, (nextLink, prevLink) => {
  if (!prevLink || nextLink) return
  if (showModal.value || showEdit.value || showAnalytics.value) return
  restoreMainViewport()
})

function restoreMainViewport() {
  const active = document.activeElement
  if (active instanceof HTMLElement) active.blur()

  if (appRoot.value instanceof HTMLElement) {
    appRoot.value.scrollTop = 0
    appRoot.value.scrollLeft = 0
  }

  if (document.scrollingElement) {
    document.scrollingElement.scrollTop = 0
    document.scrollingElement.scrollLeft = 0
  }

  window.scrollTo(0, 0)

  requestAnimationFrame(() => {
    if (appRoot.value instanceof HTMLElement) {
      appRoot.value.scrollTop = 0
      appRoot.value.scrollLeft = 0
    }
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0
      document.scrollingElement.scrollLeft = 0
    }
    window.scrollTo(0, 0)

    nextTick(() => {
      if (inputWrapper.value instanceof HTMLElement) {
        inputWrapper.value.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: 'auto',
        })
      }
    })
  })
}

async function submitEdit() {
  const updated = await submitEditLink()
  if (!updated) return
  clearAnalyticsCache()
  restoreMainViewport()
}

async function deleteLink(link) {
  const deleted = await deleteLinkByCode(link)
  if (!deleted) return
  removeCachedLinkStats(link.short_code)
}

function openModal() {
  openCreateModal()
  if (isMobileViewport.value) sidebarOpen.value = false
}

function selectLink(link) {
  selectLinkFromList(link)
  if (isMobileViewport.value) sidebarOpen.value = false
}
</script>

<style>
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
  min-height: 100dvh;
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
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.1);
  font-size: 12px;
  color: #fecaca;
  font-family: var(--mono);
  line-height: 1.45;
}

.field-error {
  margin-top: 6px;
  font-size: 12px;
  color: #fda4af;
  font-family: var(--mono);
  line-height: 1.4;
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
  padding: 40px;
  gap: 32px;
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
  background:
    linear-gradient(rgba(15, 21, 37, 0.9), rgba(15, 21, 37, 0.9)) padding-box,
    linear-gradient(120deg, rgba(124, 58, 237, 0.72), rgba(168, 85, 247, 0.9), rgba(236, 72, 153, 0.72), rgba(124, 58, 237, 0.72)) border-box;
  border: 1px solid transparent;
  border-radius: 16px;
  padding: 20px 24px; backdrop-filter: blur(12px);
  position: relative;
  isolation: isolate;
  background-size: 100% 100%, 240% 240%;
  background-position: center, 0% 50%;
  animation: detailBorderPulse 2.8s ease-in-out infinite, detailBorderShift 9s linear infinite;
  transition: box-shadow 0.2s;
  box-shadow:
    0 0 0 1px rgba(124, 58, 237, 0.28),
    0 0 18px rgba(124, 58, 237, 0.3),
    0 0 34px rgba(168, 85, 247, 0.18);
}

.link-detail:hover {
  box-shadow:
    0 0 0 1px rgba(168, 85, 247, 0.45),
    0 0 24px rgba(168, 85, 247, 0.4),
    0 0 40px rgba(236, 72, 153, 0.2);
}

@keyframes detailBorderPulse {
  0% {
    box-shadow:
      0 0 0 1px rgba(124, 58, 237, 0.24),
      0 0 12px rgba(124, 58, 237, 0.2),
      0 0 22px rgba(168, 85, 247, 0.12);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(168, 85, 247, 0.42),
      0 0 24px rgba(168, 85, 247, 0.36),
      0 0 44px rgba(236, 72, 153, 0.18);
  }
  100% {
    box-shadow:
      0 0 0 1px rgba(124, 58, 237, 0.24),
      0 0 12px rgba(124, 58, 237, 0.2),
      0 0 22px rgba(168, 85, 247, 0.12);
  }
}

@keyframes detailBorderShift {
  0% { background-position: center, 0% 50%; }
  50% { background-position: center, 100% 50%; }
  100% { background-position: center, 0% 50%; }
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

.error-msg {
  font-size: 12px;
  color: #EC4899;
  margin-top: 4px;
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.copy-btn:hover { background: rgba(124,58,237,0.35); }

.analytics-btn { 
  font-size: 12px; padding: 5px 12px; 
  background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); 
  border-radius: 8px; color: #34d399; cursor: pointer; transition: background 0.15s; 
  font-family: var(--font); white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.analytics-btn:hover { background: rgba(16,185,129,0.2); }

.edit-btn { 
  font-size: 12px; padding: 5px 12px; 
  background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); 
  border-radius: 8px; color: #fbbf24; cursor: pointer; 
  transition: background 0.15s; font-family: var(--font); white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.edit-btn:hover { background: rgba(251,191,36,0.2); }

.delete-btn { 
  font-size: 14px; padding: 5px 10px; 
  background: rgba(248,113,113,0.1); 
  border: 1px solid rgba(248,113,113,0.25); 
  border-radius: 8px; color: #f87171; cursor: pointer; 
   transition: background 0.15s;
   display: inline-flex;
   align-items: center;
   justify-content: center;
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
.modal-input.invalid {
  border-color: rgba(248, 113, 113, 0.65);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.16);
}
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

.analytics-visuals {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 14px 18px 8px;
  border-bottom: 1px solid var(--border);
}

.chart-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(15, 21, 37, 0.45);
  padding: 12px;
}

.chart-card-title {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: var(--mono);
  margin-bottom: 8px;
}

.analytics-chart {
  width: 100%;
  height: 170px;
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

.analytics-more-btn {
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg3);
  color: var(--muted);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.analytics-more-btn:hover {
  border-color: rgba(124, 58, 237, 0.35);
  color: var(--text);
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

/* LIGHT THEME */
:root.light {
  --bg:     #f0eeff;
  --bg2:    #f9f7ff;
  --bg3:    #ede9fe;
  --border: rgba(109, 40, 217, 0.12);
  --purple: #6d28d9;
  --purple2:#7c3aed;
  --glow:   rgba(109, 40, 217, 0.3);
  --text:   #1e1b4b;
  --muted:  #6b7280;
}

:root.light html,
:root.light body { background: var(--bg); }



:root.light .sidebar { background: rgba(240, 238, 255, 0.95); }

:root.light .url-input {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(109, 40, 217, 0.25);
}

:root.light .link-detail {
  background:
    linear-gradient(rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.88)) padding-box,
    linear-gradient(135deg, rgba(109, 40, 217, 0.38), rgba(124, 58, 237, 0.45), rgba(236, 72, 153, 0.28)) border-box;
  box-shadow:
    0 0 0 1px rgba(109, 40, 217, 0.2),
    0 0 16px rgba(109, 40, 217, 0.15);
}

:root.light .modal,
:root.light .auth-box {
  background: #ffffff;
  box-shadow: 0 20px 60px rgba(109, 40, 217, 0.1);
}

:root.light .chart-card {
  background: rgba(255, 255, 255, 0.7);
}

:root.light .modal-input { background: #f5f3ff; }

:root.light .modal-input.invalid {
  border-color: rgba(220, 38, 38, 0.45);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

:root.light .modal-overlay { background: rgba(180, 170, 255, 0.35); }

:root.light .auth-overlay { background: rgba(220, 215, 255, 0.7); }

:root.light .auth-error {
  color: #991b1b;
  background: rgba(239, 68, 68, 0.12);
}

:root.light .field-error {
  color: #b91c1c;
}

:root.light .stat-val,
:root.light .analytics-stat-val { color: #1e1b4b; }

:root.light .logo-bold { color: #1e1b4b; }

:root.light .burger-btn {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(109, 40, 217, 0.2);
  color: #1e1b4b;
}

.theme-btn {
  font-size: 14px;
  padding: 4px 8px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.theme-btn:hover { border-color: var(--purple2); }

/* MOBILE */
.burger-btn {
  display: none;
}

@media (max-width: 768px) {
  html,
  body {
    height: auto;
    min-height: 100%;
    overflow-y: auto;
  }

  .app {
    height: auto;
    min-height: 100dvh;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .app.sidebar-active {
    overflow-y: hidden;
  }

  .app.mobile-overlay-active {
    overflow-y: hidden;
  }

  .app.mobile-overlay-active .main {
    display: none;
  }

  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: min(84vw, 320px);
    height: 100dvh;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .burger-btn {
    display: flex;
    position: fixed;
    top: max(14px, env(safe-area-inset-top));
    left: 14px;
    z-index: 60;
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    background: rgba(15, 21, 37, 0.9);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-size: 18px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition: left 0.25s ease;
  }

  .burger-btn.open {
    left: calc(min(84vw, 320px) - 48px);
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 40;
    backdrop-filter: blur(2px);
  }

  .main {
    min-height: 100dvh;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: calc(max(14px, env(safe-area-inset-top)) + 44px) 14px max(18px, env(safe-area-inset-bottom));
  }

  .logo-wrapper {
    text-align: center;
    max-width: 360px;
  }

  .logo {
    font-size: clamp(30px, 11vw, 42px);
    margin-bottom: 8px;
  }

  .tagline {
    font-size: 12px;
    letter-spacing: 0.03em;
    line-height: 1.45;
  }

  .input-wrapper {
    max-width: 100%;
  }

  .url-input,
  .modal-input {
    font-size: 16px;
  }

  .url-input {
    padding: 16px 58px 16px 16px;
    border-radius: 14px;
  }

  .shrink-btn {
    width: 40px;
    height: 40px;
    right: 8px;
  }

  .link-detail {
    max-width: 100%;
    padding: 16px;
  }

  .detail-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .detail-actions button {
    display: flex;
    align-items: center;
    width: 100%;
    justify-content: center;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .detail-stats {
    gap: 14px;
    flex-wrap: wrap;
  }

  .stat {
    min-width: 92px;
  }

  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .modal {
    width: 100%;
    max-width: none;
    max-height: 88dvh;
    border-radius: 20px 20px 0 0;
    padding: 22px 18px;
    overflow-y: auto;
  }

  .modal-row {
    flex-direction: column;
    gap: 12px;
  }

  .modal-actions {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 8px;
  }

  .btn-cancel,
  .btn-create {
    width: 100%;
  }

  .analytics-modal {
    max-height: 88dvh;
  }

  .analytics-header {
    padding: 18px 18px 14px;
  }

  .analytics-stats {
    flex-direction: column;
  }

  .analytics-stat {
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 14px 18px;
  }

  .analytics-stat:last-child {
    border-bottom: none;
  }

  .analytics-clicks-header {
    padding: 12px 18px;
  }

  .analytics-visuals {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 12px;
  }

  .analytics-chart {
    height: 160px;
  }

  .analytics-clicks-list {
    padding: 0 12px 12px;
  }

  .analytics-click-item {
    align-items: flex-start;
    gap: 6px;
    padding: 10px;
  }

  .click-time {
    padding-left: 24px;
  }

  .auth-overlay {
    align-items: flex-start;
    padding: max(16px, env(safe-area-inset-top)) 12px 16px;
    overflow-y: auto;
  }

  .auth-box {
    margin-top: 24px;
    max-width: none;
    padding: 24px 18px;
  }
}

</style>

