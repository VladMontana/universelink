<template>
  <aside class="sidebar" :class="{ open: props.sidebarOpen }">
    <div class="sidebar-header">
      <span class="sidebar-title">История ссылок</span>
      <span class="sidebar-count">{{ props.links.length }}</span>
    </div>

    <div class="sidebar-list">
      <div v-if="props.links.length === 0" class="sidebar-empty">Пока нет ссылок</div>

      <div
        v-for="item in preparedLinks"
        :key="item.link.id"
        class="sidebar-item"
        :class="{ active: props.selectedLinkId === item.link.id }"
        @click="emit('select-link', item.link)"
      >
        <div class="sidebar-item-top">
          <span class="sidebar-short">{{ item.shortUrl }}</span>
          <span class="sidebar-date">{{ item.createdAt }}</span>
        </div>
        <div class="sidebar-item-bottom">
          <span class="sidebar-original">{{ item.originalUrl }}</span>
          <div class="sidebar-badges">
            <span v-if="item.link.max_clicks" class="badge badge-click">
              {{ item.link.click_count }}/{{ item.link.max_clicks }}
            </span>
            <span v-if="item.link.expires_at" class="badge badge-time">
              {{ item.expiresAt }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <span class="user-email">{{ props.userEmail }}</span>
      <button class="theme-btn" :aria-label="props.isDark ? 'Включить светлую тему' : 'Включить тёмную тему'" @click="emit('toggle-theme')">
        <Sun v-if="props.isDark" :size="16" aria-hidden="true" />
        <Moon v-else :size="16" aria-hidden="true" />
      </button>
      <button class="logout-btn" @click="emit('logout')">Выйти</button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'

const props = defineProps({
  links: { type: Array, required: true },
  selectedLinkId: { type: Number, default: null },
  baseUrl: { type: String, required: true },
  userEmail: { type: String, default: '' },
  isDark: { type: Boolean, required: true },
  sidebarOpen: { type: Boolean, required: true },
  formatDate: { type: Function, required: true },
  formatExpiry: { type: Function, required: true },
  truncate: { type: Function, required: true },
})

const emit = defineEmits(['select-link', 'toggle-theme', 'logout'])

const preparedLinks = computed(() => props.links.map((link) => ({
  link,
  shortUrl: `${props.baseUrl}/${link.short_code}`,
  createdAt: props.formatDate(link.created_at),
  originalUrl: props.truncate(link.original_url),
  expiresAt: link.expires_at ? props.formatExpiry(link.expires_at) : '',
})))
</script>
