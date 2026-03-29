import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthOverlay from '../../src/components/AuthOverlay.vue'

describe('AuthOverlay', () => {
  it('shows field errors from props', () => {
    const wrapper = mount(AuthOverlay, {
      props: {
        authMode: 'login',
        authLoading: false,
        authError: '',
        email: '',
        password: '',
        emailError: 'Введите email',
        passwordError: 'Введите пароль',
      },
    })

    const errors = wrapper.findAll('.field-error').map((item) => item.text())
    expect(errors).toEqual(['Введите email', 'Введите пароль'])
  })

  it('emits form updates and submit action', async () => {
    const wrapper = mount(AuthOverlay, {
      props: {
        authMode: 'login',
        authLoading: false,
        authError: '',
        email: '',
        password: '',
        emailError: '',
        passwordError: '',
      },
    })

    await wrapper.find('input[type="email"]').setValue('user@mail.com')
    await wrapper.find('input[type="password"]').setValue('qwerty123')
    await wrapper.find('.btn-create').trigger('click')

    expect(wrapper.emitted('update:email')?.[0]).toEqual(['user@mail.com'])
    expect(wrapper.emitted('update:password')?.[0]).toEqual(['qwerty123'])
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })
})
