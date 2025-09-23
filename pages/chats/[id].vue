<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import ChatMessages from '~/components/ChatMessages.vue'
import ChatInput from '~/components/ChatInput.vue'

const router = useRouter()
const chatsStore = useChatsStore()

const chatId = router.currentRoute.value.params.id as string
chatsStore.activeChatId = chatId
await chatsStore.loadHistory(chatId)

const messagesContainer = ref<HTMLDivElement | null>(null)

async function scrollToBottom(smooth = false) {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    })
  }
}

watch(
  () => chatsStore.activeMessages.length,
  async () => {
    await scrollToBottom(true)
  }
)

watch(
  () => chatsStore.activeMessages.at(-1)?.content,
  async () => {
    await scrollToBottom(true)
  }
)

onMounted(async () => {
  await scrollToBottom(false)
})

async function handleSend(text: string) {
  if (!text.trim()) return
  await chatsStore.sendMessage(chatId, { text })
}
</script>

<template>
  <div class="chat-area">
    <div ref="messagesContainer" class="chat-area__messages">
      <!-- Скелетоны -->
      <template v-if="chatsStore.loading">
        <div v-for="i in 5" :key="i" class="flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <div class="flex flex-col gap-2">
              <div class="h-12 w-[220px] rounded-md bg-[#2a2a2a]" />
            </div>
          </div>
          <div class="flex items-start justify-end gap-3">
            <div class="flex flex-col gap-2 items-end">
              <div class="h-12 w-[200px] rounded-md bg-[#3c3c3c]" />
            </div>
          </div>
        </div>
      </template>

      <!-- Сообщения -->
      <template v-else-if="chatsStore.activeMessages.length > 0">
        <ChatMessages
          v-for="(m, idx) in chatsStore.activeMessages"
          :key="idx"
          :role="m.role"
          :content="m.content"
        />
      </template>

      <!-- Пустое состояние -->
      <template v-else>
        <div class="empty-state">
          <div class="empty-state__icon">
            <Icon name="pixel:face-thinking-solid"></Icon>
          </div>
          <div class="empty-state__text">Write your first message!</div>
        </div>
      </template>
    </div>

    <div class="chat-area__footer">
      <ChatInput :loading="chatsStore.loading" @send="handleSend" />
    </div>
  </div>
</template>

<style scoped>
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-area__messages {
  flex: 1;
  min-height: 0;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  margin: auto;
  text-align: center;
  color: #888;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.8;
  user-select: none;
}

.empty-state__icon {
  font-size: 3rem;
}

.empty-state__text {
  font-size: 1rem;
}

.chat-area__footer {
  padding: 0.75rem;
}
</style>
