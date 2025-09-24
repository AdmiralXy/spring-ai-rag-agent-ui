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
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.chat-area__space-label {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: #aaa;
  opacity: 0.8;
  pointer-events: none;
}

.chat-area__messages {
  flex: 1;
  min-height: 0;
  padding: 2rem 1rem 1rem;
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
