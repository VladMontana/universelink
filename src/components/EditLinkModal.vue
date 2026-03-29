<template>
  <div class="modal-overlay" @click.self="emit('close')">
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
        <button class="btn-cancel" @click="emit('close')">Отмена</button>
        <button class="btn-create" :disabled="editLoading" @click="emit('submit')">
          {{ editLoading ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  editForm: { type: Object, required: true },
  editLoading: { type: Boolean, required: true },
})

const emit = defineEmits(['close', 'submit'])
</script>
