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
    async sendMessage(chatId: string, payload: { text: string }) {
      this.loading = true
      try {
        if (!this.messages[chatId]) {
          this.messages = { ...this.messages, [chatId]: [] }
        }

        this.messages[chatId]?.push({ role: 'USER', content: payload.text })

        this.messages[chatId]?.push({ role: 'ASSISTANT', content: '...' })

        const url = `${useRuntimeConfig().public.apiBase}/chats/${chatId}/stream?text=${encodeURIComponent(
          payload.text
        )}`
        const eventSource = new EventSource(url)

        eventSource.onmessage = (e) => {
          if (e.data === '[DONE]') {
            eventSource.close()
            this.loading = false
            return
          }

          const msgs = this.messages[chatId]
          if (!msgs) return
          const lastIdx = msgs.length - 1
          const last = msgs[lastIdx]

          if (last?.role === 'ASSISTANT') {
            this.messages[chatId]?.splice(lastIdx, 1, {
              role: 'ASSISTANT',
              content: e.data
            })
          }
        }

        eventSource.onerror = () => {
          eventSource.close()
          this.loading = false
        }
      } finally {
        /* пусто */
      }
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
    }
  }
})
