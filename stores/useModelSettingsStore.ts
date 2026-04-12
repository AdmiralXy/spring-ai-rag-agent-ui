import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'
import { useModelsStore } from '~/stores/useModelsStore'

const SETTINGS_PASSWORD_KEY = 'settings-page-password'

function getSettingsAuthHeaders() {
  if (!import.meta.client) return undefined

  const password = sessionStorage.getItem(SETTINGS_PASSWORD_KEY)
  if (!password) return undefined

  return {
    Authorization: `Basic ${password}`
  }
}

const defaultEmbeddings: EmbeddingsModelSettings = {
  provider: 'OPENAI',
  baseUrl: '',
  apiKey: '',
  name: '',
  dimensions: 1536,
  maxDocumentTokens: 7000
}

const defaultSummarizer: SummarizerModelSettings = {
  provider: 'OPENAI',
  name: '',
  baseUrl: '',
  apiKey: '',
  systemPrompt: ''
}

export const useModelSettingsStore = defineStore('model-settings', {
  state: () => ({
    chatModels: [] as ChatModelSettings[],
    embeddings: { ...defaultEmbeddings } as EmbeddingsModelSettings,
    summarizer: { ...defaultSummarizer } as SummarizerModelSettings,
    loadedChat: false,
    loadedEmbeddings: false,
    loadedSummarizer: false,
    loadingChat: false,
    loadingEmbeddings: false,
    loadingSummarizer: false
  }),

  actions: {
    async syncSelectableModels() {
      const modelsStore = useModelsStore()
      await modelsStore.fetchModels()
    },

    async fetchChatModels() {
      this.loadingChat = true
      try {
        const api = useApi()
        const res = await api.get<GetChatModelsSettingsRs>('/settings/models/chat', {
          headers: getSettingsAuthHeaders()
        })
        this.chatModels = res.models
        this.loadedChat = true
        return this.chatModels
      } finally {
        this.loadingChat = false
      }
    },

    async createChatModel(payload: UpsertChatModelRq) {
      this.loadingChat = true
      try {
        const api = useApi()
        await api.post<ChatModelSettings>('/settings/models/chat', payload, {
          headers: getSettingsAuthHeaders()
        })
        await this.fetchChatModels()
        await this.syncSelectableModels()
      } finally {
        this.loadingChat = false
      }
    },

    async updateChatModel(id: string, payload: UpsertChatModelRq) {
      this.loadingChat = true
      try {
        const api = useApi()
        await api.put<ChatModelSettings>(`/settings/models/chat/${id}`, payload, {
          headers: getSettingsAuthHeaders()
        })
        await this.fetchChatModels()
        await this.syncSelectableModels()
      } finally {
        this.loadingChat = false
      }
    },

    async deleteChatModel(id: string) {
      this.loadingChat = true
      try {
        const api = useApi()
        await api.del<null>(`/settings/models/chat/${id}`, {
          headers: getSettingsAuthHeaders()
        })
        this.chatModels = this.chatModels.filter((model) => model.id !== id)
        await this.syncSelectableModels()
      } finally {
        this.loadingChat = false
      }
    },

    async fetchEmbeddings() {
      this.loadingEmbeddings = true
      try {
        const api = useApi()
        const res = await api.get<EmbeddingsModelSettings>('/settings/models/embeddings', {
          headers: getSettingsAuthHeaders()
        })
        this.embeddings = res
        this.loadedEmbeddings = true
        return this.embeddings
      } finally {
        this.loadingEmbeddings = false
      }
    },

    async updateEmbeddings(payload: EmbeddingsModelSettings) {
      this.loadingEmbeddings = true
      try {
        const api = useApi()
        const res = await api.put<EmbeddingsModelSettings>('/settings/models/embeddings', payload, {
          headers: getSettingsAuthHeaders()
        })
        this.embeddings = res
      } finally {
        this.loadingEmbeddings = false
      }
    },

    async fetchSummarizer() {
      this.loadingSummarizer = true
      try {
        const api = useApi()
        const res = await api.get<SummarizerModelSettings>('/settings/models/summarizer', {
          headers: getSettingsAuthHeaders()
        })
        this.summarizer = res
        this.loadedSummarizer = true
        return this.summarizer
      } finally {
        this.loadingSummarizer = false
      }
    },

    async updateSummarizer(payload: SummarizerModelSettings) {
      this.loadingSummarizer = true
      try {
        const api = useApi()
        const res = await api.put<SummarizerModelSettings>('/settings/models/summarizer', payload, {
          headers: getSettingsAuthHeaders()
        })
        this.summarizer = res
      } finally {
        this.loadingSummarizer = false
      }
    }
  }
})
