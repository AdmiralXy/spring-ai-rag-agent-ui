import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'

export const usePromptTemplatesStore = defineStore('prompt-templates', {
  state: () => ({
    templates: [] as PromptTemplate[],
    loading: false
  }),

  getters: {
    getById: (state) => {
      return (id: string) => state.templates.find((template) => template.id === id)
    }
  },

  actions: {
    async fetchPromptTemplates() {
      this.loading = true
      try {
        const api = useApi()
        const res = await api.get<GetPromptTemplatesRs>('/prompt-templates')
        this.templates = res.templates
        return this.templates
      } finally {
        this.loading = false
      }
    },

    async createPromptTemplate(payload: CreatePromptTemplateRq) {
      this.loading = true
      try {
        const api = useApi()
        const created = await api.post<PromptTemplate>('/prompt-templates', payload)
        this.templates.unshift(created)
        return created
      } finally {
        this.loading = false
      }
    },

    async updatePromptTemplate(id: string, payload: UpdatePromptTemplateRq) {
      this.loading = true
      try {
        const api = useApi()
        const updated = await api.patch<PromptTemplate>(`/prompt-templates/${id}`, payload)
        const index = this.templates.findIndex((template) => template.id === id)

        if (index >= 0) {
          this.templates.splice(index, 1, updated)
        } else {
          this.templates.unshift(updated)
        }

        return updated
      } catch (err: unknown) {
        const apiError = err as {
          response?: { _data?: { message?: string } }
          message?: string
        }
        const message = String(
          apiError.response?._data?.message || apiError.message || ''
        ).toLowerCase()

        if (message.includes('prompt template not found')) {
          this.templates = this.templates.filter((template) => template.id !== id)
          return null
        }

        throw err
      } finally {
        this.loading = false
      }
    },

    async deletePromptTemplate(id: string) {
      this.loading = true
      try {
        const api = useApi()
        await api.del(`/prompt-templates/${id}`)
        this.templates = this.templates.filter((template) => template.id !== id)
      } finally {
        this.loading = false
      }
    }
  }
})
