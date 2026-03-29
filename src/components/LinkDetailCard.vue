<template>
  <div class="link-detail">
    <div class="detail-top">
      <span class="detail-short">{{ baseUrl }}/{{ link.short_code }}</span>
      <button class="close-btn" style="margin-left: auto; display: block;" aria-label="Закрыть карточку" @click="emit('close')">
        <X :size="16" aria-hidden="true" />
      </button>
    </div>
    <div class="detail-actions">
      <button class="copy-btn" @click="emit('copy', link.short_code)">
        <Copy :size="14" aria-hidden="true" />
        {{ copied ? 'Скопировано!' : 'Копировать' }}
      </button>
      <button class="analytics-btn" @click="emit('open-analytics', link)">
        <BarChart3 :size="14" aria-hidden="true" />
        Аналитика
      </button>
      <button class="edit-btn" @click="emit('open-edit', link)">
        <Pencil :size="14" aria-hidden="true" />
        Изменить
      </button>
      <button class="delete-btn" aria-label="Удалить ссылку" @click="emit('delete-link', link)">
        <Trash2 :size="14" aria-hidden="true" />
      </button>
    </div>
    <div class="detail-row">
      <span class="detail-label">Оригинал</span>
      <a :href="link.original_url" target="_blank" rel="noopener noreferrer" class="detail-url">
        {{ link.original_url }}
      </a>
    </div>
    <div class="detail-stats">
      <div class="stat">
        <span class="stat-val">{{ link.click_count }}</span>
        <span class="stat-label">переходов</span>
      </div>
      <div v-if="link.max_clicks" class="stat">
        <span class="stat-val">{{ link.max_clicks }}</span>
        <span class="stat-label">лимит</span>
      </div>
      <div v-if="link.expires_at" class="stat">
        <span class="stat-val">{{ formatExpiry(link.expires_at) }}</span>
        <span class="stat-label">истекает</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { BarChart3, Copy, Pencil, Trash2, X } from 'lucide-vue-next'

defineProps({
  link: { type: Object, required: true },
  baseUrl: { type: String, required: true },
  copied: { type: Boolean, required: true },
  formatExpiry: { type: Function, required: true },
})

const emit = defineEmits(['close', 'copy', 'open-analytics', 'open-edit', 'delete-link'])
</script>
