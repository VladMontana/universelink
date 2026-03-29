import { onUnmounted, ref, unref } from 'vue'
import { toast } from 'vue-sonner'
import {
  createLinkRequest,
  deleteLinkRequest,
  fetchLinksRequest,
  updateLinkRequest,
} from '../services/linksApi'

export function useLinks({ apiUrl, baseUrl, token, onUnauthorized }) {
  /** @type {import('vue').Ref<import('../types/models').Link[]>} */
  const links = ref([])
  /** @type {import('vue').Ref<import('../types/models').Link | null>} */
  const selectedLink = ref(null)

  const inputUrl = ref('')
  const showModal = ref(false)
  const loading = ref(false)
  const copied = ref(false)
  const error = ref('')

  const showEdit = ref(false)
  const editLoading = ref(false)
  const editLink = ref(null)
  const editForm = ref({ custom_code: '', max_clicks: null, expires_at: '' })

  const form = ref({ url: '', customCode: '', maxClicks: null, expiresAt: '' })
  let linksAbortController = null

  onUnmounted(() => {
    if (linksAbortController) linksAbortController.abort()
  })

  function clearLinksState() {
    links.value = []
    selectedLink.value = null
    showModal.value = false
    showEdit.value = false
    editLink.value = null
    error.value = ''
  }

  async function fetchLinks() {
    if (linksAbortController) linksAbortController.abort()
    linksAbortController = new AbortController()

    try {
      const { response, data } = await fetchLinksRequest(apiUrl, token.value, linksAbortController.signal)
      if (response.status === 401) {
        onUnauthorized?.()
        toast.error('Сессия истекла. Войдите снова.')
        return
      }
      if (response.ok) {
        links.value = Array.isArray(data) ? data : []
        return
      }
      toast.error('Не удалось загрузить список ссылок.')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      console.error(e)
      toast.error('Ошибка сети при загрузке ссылок.')
    } finally {
      linksAbortController = null
    }
  }

  async function createLink() {
    if (!form.value.url) {
      error.value = 'Введите URL перед сокращением.'
      toast.error(error.value)
      return
    }
    loading.value = true
    error.value = ''

    try {
      const body = {
        original_url: form.value.url,
        ...(form.value.customCode && { custom_code: form.value.customCode }),
        ...(form.value.maxClicks && { max_clicks: form.value.maxClicks }),
        ...(form.value.expiresAt && { expires_at: new Date(form.value.expiresAt).toISOString() }),
      }

      const { response, data } = await createLinkRequest(apiUrl, token.value, body)

      if (response.status === 401) {
        onUnauthorized?.()
        toast.error('Сессия истекла. Войдите снова.')
        return
      }

      if (!response.ok) {
        error.value = data?.detail || 'Не удалось создать ссылку.'
        toast.error(error.value)
        return
      }

      links.value.unshift(data)
      selectedLink.value = data
      closeCreateModal()
      resetForm()
      toast.success('Ссылка успешно создана.')
    } catch (e) {
      console.error(e)
      error.value = 'Ошибка сети. Попробуйте снова.'
      toast.error(error.value)
    } finally {
      loading.value = false
    }
  }

  function closeCreateModal() {
    showModal.value = false
  }

  function closeEditModal() {
    showEdit.value = false
  }

  function openModal() {
    form.value.url = inputUrl.value
    showModal.value = true
  }

  function selectLink(link) {
    selectedLink.value = selectedLink.value?.id === link.id ? null : link
  }

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
    if (!editLink.value) return false

    editLoading.value = true
    const target = editLink.value
    try {
      const body = {}
      if (editForm.value.custom_code) body.custom_code = editForm.value.custom_code
      if (editForm.value.max_clicks) body.max_clicks = editForm.value.max_clicks
      if (editForm.value.expires_at) body.expires_at = new Date(editForm.value.expires_at).toISOString()

      const { response, data } = await updateLinkRequest(apiUrl, token.value, editLink.value.short_code, body)

      if (response.status === 401) {
        onUnauthorized?.()
        closeEditModal()
        toast.error('Сессия истекла. Войдите снова.')
        return false
      }

      if (response.ok) {
        const fallbackUpdated = {
          ...target,
          short_code: editForm.value.custom_code || target.short_code,
          max_clicks: editForm.value.max_clicks || null,
          expires_at: editForm.value.expires_at ? new Date(editForm.value.expires_at).toISOString() : null,
        }
        const updatedLink = data || fallbackUpdated
        replaceLinkInState(updatedLink)
        selectedLink.value = null
        closeEditModal()
        toast.success('Изменения сохранены.')
        return true
      }

      toast.error('Не удалось обновить ссылку.')
      return false
    } catch (e) {
      console.error(e)
      toast.error('Ошибка сети при сохранении изменений.')
      return false
    } finally {
      editLoading.value = false
    }
  }

  async function deleteLink(link) {
    if (!confirm(`Удалить ссылку ${link.short_code}?`)) return false

    try {
      const { response } = await deleteLinkRequest(apiUrl, token.value, link.short_code)

      if (response.status === 401) {
        onUnauthorized?.()
        toast.error('Сессия истекла. Войдите снова.')
        return false
      }

      if (response.ok || response.status === 204) {
        links.value = links.value.filter((item) => item.id !== link.id)
        selectedLink.value = null
        toast.success('Ссылка удалена.')
        return true
      }

      toast.error('Не удалось удалить ссылку.')
      return false
    } catch (e) {
      console.error(e)
      toast.error('Ошибка сети при удалении ссылки.')
      return false
    }
  }

  async function copyLink(code) {
    try {
      await navigator.clipboard.writeText(`${unref(baseUrl)}/${code}`)
      copied.value = true
      toast.success('Ссылка скопирована.')
      setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch (e) {
      console.error(e)
      toast.error('Не удалось скопировать ссылку.')
    }
  }

  function resetForm() {
    form.value = { url: '', customCode: '', maxClicks: null, expiresAt: '' }
    inputUrl.value = ''
    error.value = ''
  }

  function replaceLinkInState(updatedLink) {
    const index = links.value.findIndex((item) => item.id === updatedLink.id)
    if (index === -1) return
    links.value[index] = updatedLink
    if (selectedLink.value?.id === updatedLink.id) selectedLink.value = updatedLink
  }

  return {
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
    fetchLinks,
    createLink,
    closeCreateModal,
    closeEditModal,
    openModal,
    selectLink,
    openEdit,
    submitEdit,
    deleteLink,
    copyLink,
    clearLinksState,
  }
}
