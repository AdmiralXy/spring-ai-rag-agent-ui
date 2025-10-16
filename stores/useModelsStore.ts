import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'

export const useModelsStore = defineStore('models', {
  state: () => ({
    models: [] as ModelInfoRs[],
    loading: false
  }),

  getters: {
    getByValue: (state) => {
      return (value: string) => state.models.find((m) => m.value === value)
    }
  },

  actions: {
    async fetchModels() {
      this.loading = true
      try {
        const api = useApi()
        const res = await api.get<ModelsListRs>('/models')
        this.models = res.models
      } finally {
        this.loading = false
      }
    }
  }
})
