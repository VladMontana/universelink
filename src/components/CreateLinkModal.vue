<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <h2 class="modal-title">Новая ссылка</h2>

      <div class="modal-field">
        <label>URL</label>
        <input v-model="form.url" class="modal-input" placeholder="https://..." />
      </div>

      <div class="modal-field">
        <label>Свой код <span class="optional">необязательно</span></label>
        <input v-model="form.customCode" class="modal-input" placeholder="my-link" maxlength="20" />
        <span v-if="error" class="error-msg">{{ error }}</span>
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
        <button class="btn-cancel" @click="emit('close')">Отмена</button>
        <button class="btn-create" :disabled="loading" @click="emit('submit')">
          {{ loading ? 'Создаём…' : 'Сократить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  form: { type: Object, required: true },
  error: { type: String, default: '' },
  loading: { type: Boolean, required: true },
})

const emit = defineEmits(['close', 'submit'])
</script>
