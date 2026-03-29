<template>
  <div class="auth-overlay">
    <div class="auth-box">
      <h1 class="logo" style="text-align:center; margin-bottom: 8px; font-size: clamp(28px, 8vw, 40px);">
        <span class="logo-light">Universe</span><span class="logo-bold">Link</span>
      </h1>
      <p class="tagline" style="text-align:center; margin-bottom: 28px;">
        {{ authMode === 'login' ? 'Войдите в аккаунт' : 'Создайте аккаунт' }}
      </p>

      <div class="modal-field">
        <label>Email</label>
        <input
          :value="email"
          class="modal-input"
          :class="{ invalid: emailError }"
          type="email"
          placeholder="you@example.com"
          @input="emit('update:email', $event.target.value)"
        />
        <p v-if="emailError" class="field-error">{{ emailError }}</p>
      </div>

      <div class="modal-field" style="margin-top: 14px;">
        <label>Пароль</label>
        <input
          :value="password"
          class="modal-input"
          :class="{ invalid: passwordError }"
          type="password"
          placeholder="••••••••"
          @input="emit('update:password', $event.target.value)"
        />
        <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
      </div>

      <p v-if="authError" class="auth-error">{{ authError }}</p>

      <button class="btn-create" style="width:100%; margin-top: 20px;" :disabled="authLoading" @click="emit('submit')">
        {{ authLoading ? 'Подождите…' : (authMode === 'login' ? 'Войти' : 'Зарегистрироваться') }}
      </button>

      <p class="auth-switch">
        {{ authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?' }}
        <span @click="emit('toggle-mode')">{{ authMode === 'login' ? 'Зарегистрироваться' : 'Войти' }}</span>
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  authMode: { type: String, required: true },
  authLoading: { type: Boolean, required: true },
  authError: { type: String, default: '' },
  email: { type: String, default: '' },
  password: { type: String, default: '' },
  emailError: { type: String, default: '' },
  passwordError: { type: String, default: '' },
})

const emit = defineEmits(['update:email', 'update:password', 'toggle-mode', 'submit'])
</script>
