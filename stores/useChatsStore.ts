import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'

export const useChatsStore = defineStore('chats', {
  state: () => ({
    chats: [] as Chat[],
    messages: {} as Record<string, ChatMessage[]>,
    activeChatId: null as string | null,
    loading: false
  }),

  getters: {
    activeChat(state): Chat | undefined {
      return state.chats.find((c) => c.id === state.activeChatId)
    },
    activeMessages(state): ChatMessage[] {
      return state.activeChatId ? (state.messages[state.activeChatId] ?? []) : []
    }
  },

  actions: {
    /** Get chats list */
    async fetchChats(size = 10) {
      this.loading = true
      try {
        const api = useApi()
        const res = await api.get<GetChatsRs>('/chats', { query: { size } })
        this.chats = res.chats.content
      } finally {
        this.loading = false
      }
    },

    /** Create new chat */
    async createChat(payload: CreateChatRq) {
      this.loading = true
      try {
        const api = useApi()
        const router = useRouter()
        const res = await api.post<CreateChatRs>('/chats', payload)

        const chat: Chat = {
          id: res.chatId,
          title: res.title,
          modelName: res.modelName,
          ragSpace: payload.ragSpace
        }

        this.chats.unshift(chat)
        this.activeChatId = chat.id
        await router.push({ name: 'chats-id', params: { id: chat.id } })
        this.messages[chat.id] = []
        return chat
      } finally {
        this.loading = false
      }
    },

    /** Send message */
    async sendMessage(chatId: string, payload: { modelName: string; text: string }) {
      this.loading = true
      if (!this.messages[chatId]) {
        this.messages = { ...this.messages, [chatId]: [] }
      }

      this.messages[chatId]?.push({ role: 'USER', content: payload.text })
      this.messages[chatId]?.push({ role: 'ASSISTANT', content: '...' })

      const url = `${useRuntimeConfig().public.apiBase}/chats/${chatId}/stream`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload })
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantText = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          const lines = part
            .split('\n')
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.replace(/^data:\s?/, ''))
            .join('\n')

          if (!lines || lines === '[DONE]') continue

          assistantText = lines.trim()

          const msgs = this.messages[chatId]
          if (!msgs) continue
          const lastIdx = msgs.length - 1

          this.messages[chatId]?.splice(lastIdx, 1, {
            role: 'ASSISTANT',
            content: assistantText
          })
        }
      }

      this.loading = false
    },

    /** Get chat history */
    async loadHistory(chatId: string) {
      this.loading = true
      try {
        const api = useApi()
        const res = await api.get<ChatHistoryRs>(`/chats/${chatId}/history`)
        this.messages[chatId] = res.messages
      } finally {
        this.loading = false
      }
    },

    /** Delete chat */
    async deleteChat(chatId: string) {
      this.loading = true
      try {
        const api = useApi()

        await api.del<null>(`/chats/${chatId}`)

        this.chats = this.chats.filter((c) => c.id !== chatId)

        const { [chatId]: removed, ...rest } = this.messages
        this.messages = rest
      } finally {
        this.loading = false
      }
    },

    /** Update model for chat */
    async updateModelName(chatId: string, modelAlias: string) {
      this.loading = true
      try {
        const api = useApi()
        await api.patch(`/chats/${chatId}/model`, { modelAlias })

        const chat = this.chats.find((c) => c.id === chatId)
        if (chat) {
          chat.modelName = modelAlias
        }
      } finally {
        this.loading = false
      }
    }
  }
})
