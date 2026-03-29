import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import App from '../../src/App.vue'

function mountApp() {
  return mount(App, {
    global: {
      stubs: {
        transition: false,
      },
    },
  })
}

describe('App auth validation', () => {
  it('shows friendly validation errors for empty fields', async () => {
    global.fetch = vi.fn()
    const wrapper = mountApp()

    await wrapper.find('.btn-create').trigger('click')
    await flushPromises()

    const errors = wrapper.findAll('.field-error').map((item) => item.text())
    expect(errors).toEqual(['Введите email, чтобы продолжить.', 'Введите пароль.'])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('validates register password length before API call', async () => {
    global.fetch = vi.fn()
    const wrapper = mountApp()

    await wrapper.find('.auth-switch span').trigger('click')
    await wrapper.find('input[type="email"]').setValue('user@mail.com')
    await wrapper.find('input[type="password"]').setValue('12345')
    await wrapper.find('.btn-create').trigger('click')
    await flushPromises()

    const passwordError = wrapper.findAll('.field-error').map((item) => item.text())[0]
    expect(passwordError).toBe('Пароль должен содержать минимум 8 символов.')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('maps backend auth errors to readable UI message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ detail: 'Invalid credentials' }),
    })

    const wrapper = mountApp()
    await wrapper.find('input[type="email"]').setValue('user@mail.com')
    await wrapper.find('input[type="password"]').setValue('qwerty123')
    await wrapper.find('.btn-create').trigger('click')
    await flushPromises()

    expect(wrapper.find('.auth-error').text()).toBe('Неверный email или пароль. Проверьте данные и попробуйте снова.')
  })
})
