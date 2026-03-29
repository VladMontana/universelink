import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { loginRequest, registerRequest } from '../services/authApi'

export function useAuth({ apiUrl, onAuthenticated, onLogout }) {
  const token = ref(localStorage.getItem('token') || '')
  const userEmail = ref(localStorage.getItem('userEmail') || '')

  const authMode = ref('login')
  const authLoading = ref(false)
  const authError = ref('')
  const authForm = ref({ email: '', password: '' })
  const authFieldErrors = ref({ email: '', password: '' })

  const isAuthenticated = computed(() => !!token.value)

  function toggleAuthMode() {
    authMode.value = authMode.value === 'login' ? 'register' : 'login'
    authError.value = ''
    authFieldErrors.value = { email: '', password: '' }
  }

  function updateAuthEmail(value) {
    authForm.value.email = value
    authFieldErrors.value.email = ''
    authError.value = ''
  }

  function updateAuthPassword(value) {
    authForm.value.password = value
    authFieldErrors.value.password = ''
    authError.value = ''
  }

  function validateAuthForm() {
    const nextErrors = { email: '', password: '' }
    const email = authForm.value.email.trim()
    const password = authForm.value.password

    if (!email) {
      nextErrors.email = 'Введите email, чтобы продолжить.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Проверьте формат email. Пример: name@mail.com.'
    }

    if (!password) {
      nextErrors.password = 'Введите пароль.'
    } else if (authMode.value === 'register' && password.length < 8) {
      nextErrors.password = 'Пароль должен содержать минимум 8 символов.'
    }

    authFieldErrors.value = nextErrors
    return !nextErrors.email && !nextErrors.password
  }

  function normalizeAuthError(detail) {
    if (Array.isArray(detail)) {
      return normalizeAuthError(detail[0]?.msg || detail[0])
    }

    if (detail && typeof detail === 'object') {
      return normalizeAuthError(detail.msg || detail.detail)
    }

    const message = String(detail || '').toLowerCase()
    if (!message) {
      return authMode.value === 'register'
        ? 'Не удалось создать аккаунт. Попробуйте еще раз.'
        : 'Не удалось войти. Попробуйте еще раз.'
    }

    if (message.includes('already') || message.includes('exists') || message.includes('registered')) {
      return 'Этот email уже зарегистрирован. Попробуйте войти в аккаунт.'
    }

    if (message.includes('invalid') && message.includes('email')) {
      return 'Email указан в неверном формате.'
    }

    if (message.includes('password') && (message.includes('short') || message.includes('length') || message.includes('least'))) {
      return 'Пароль слишком короткий. Используйте минимум 8 символов.'
    }

    if (message.includes('incorrect') || message.includes('invalid credentials') || message.includes('unauthorized')) {
      return 'Неверный email или пароль. Проверьте данные и попробуйте снова.'
    }

    return authMode.value === 'register'
      ? 'Не удалось завершить регистрацию. Попробуйте еще раз.'
      : 'Не удалось выполнить вход. Попробуйте позже.'
  }

  async function submitAuth() {
    if (!validateAuthForm()) return

    const email = authForm.value.email.trim()

    authError.value = ''
    authLoading.value = true
    try {
      if (authMode.value === 'register') {
        const { response, data } = await registerRequest(apiUrl, email, authForm.value.password)
        if (!response.ok) {
          authError.value = normalizeAuthError(data?.detail)
          return
        }
        authMode.value = 'login'
      }

      const { response, data } = await loginRequest(apiUrl, email, authForm.value.password)

      if (!response.ok) {
        authError.value = normalizeAuthError(data?.detail)
        return
      }

      token.value = data.access_token
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('userEmail', email)
      userEmail.value = email
      authForm.value = { email: '', password: '' }
      authFieldErrors.value = { email: '', password: '' }

      await onAuthenticated?.()
    } catch {
      authError.value = 'Нет соединения с сервером. Проверьте интернет и попробуйте снова.'
      toast.error(authError.value)
    } finally {
      authLoading.value = false
    }
  }

  function logout() {
    token.value = ''
    userEmail.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    onLogout?.()
  }

  return {
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
  }
}
