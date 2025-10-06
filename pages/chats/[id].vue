<script setup lang="ts">
import { ref, watch, nextTick, onMounted, computed } from 'vue'
import ChatMessages from '~/components/ChatMessages.vue'
import ChatInput from '~/components/ChatInput.vue'

const router = useRouter()
const chatsStore = useChatsStore()
const spacesStore = useSpacesStore()

const chatId = router.currentRoute.value.params.id as string
chatsStore.activeChatId = chatId
await chatsStore.loadHistory(chatId)

const messagesContainer = ref<HTMLDivElement | null>(null)

const currentChat = computed(() => chatsStore.activeChat)
const currentSpace = computed(() =>
  currentChat.value ? spacesStore.getById(currentChat.value.ragSpace) : null
)

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
    <client-only>
      <div v-if="currentSpace" class="chat-area__space-label">Space: {{ currentSpace.name }}</div>
    </client-only>

    <div ref="messagesContainer" class="chat-area__messages">
      <template v-if="chatsStore.activeMessages.length > 0">
        <ChatMessages
          v-for="(m, idx) in chatsStore.activeMessages"
          :key="idx"
          :role="m.role"
          :content="m.content"
        />
      </template>

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
@import 'tailwindcss/theme';

.chat-area {
  @apply flex flex-col flex-1 min-h-0 relative;
}

.chat-area__space-label {
  @apply absolute top-4 left-1/2 -translate-x-1/2 text-xs text-gray-400 opacity-80 pointer-events-none;
}

.chat-area__messages {
  @apply flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-visible gap-4 px-4 pt-8 pb-4;
}

.empty-state {
  @apply m-auto text-center text-gray-500 flex flex-col items-center opacity-80 select-none;
}

.empty-state__icon {
  @apply text-5xl;
}

.empty-state__text {
  @apply text-base;
}

.chat-area__footer {
  @apply p-3;
}
</style>
