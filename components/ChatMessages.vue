<script setup lang="ts">
import { useMessageParts } from '~/composables/useMessageParts'
import CodeBlock from '~/components/CodeBlock.vue'
import { computed } from 'vue'

const props = defineProps<{
  role: 'USER' | 'ASSISTANT' | string
  content: string
  loading?: boolean
}>()

const parts = computed(() => useMessageParts(props.content))
</script>

<template>
  <div
    class="chat-message"
    :class="props.role === 'USER' ? 'chat-message--user' : 'chat-message--assistant'"
  >
    <div class="chat-message__bubble">
      <template v-for="(part, idx) in parts" :key="idx">
        <div
          v-if="part.type === 'heading'"
          class="chat-message__heading"
          :class="`chat-message__heading--l${part.level || 2}`"
        >
          {{ part.content }}
        </div>

        <span v-else-if="part.type === 'text'" class="chat-message__text">
          {{ part.content }}
        </span>

        <strong v-else-if="part.type === 'bold'" class="chat-message__text chat-message__bold">
          {{ part.content }}
        </strong>

        <!-- 💡 Используем новый компонент -->
        <CodeBlock v-else-if="part.type === 'code'" :code="part.content" :idx="idx" />

        <div v-else-if="part.type === 'delimiter'" class="chat-message__delimiter"></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.chat-message {
  max-width: 70%;
  padding: 0.5rem 1rem;
}

.chat-message--user {
  margin-left: auto;
}
.chat-message--assistant {
  margin-right: auto;
}

.chat-message__bubble {
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
}

.chat-message--user .chat-message__bubble {
  background: #323232d9;
  color: #ffffff;
  border-radius: 0.75rem 0.75rem 0.25rem 0.75rem;
}

.chat-message--assistant .chat-message__bubble {
  background: #1d1d1d;
  color: rgb(var(--ui-text, 234, 234, 234));
  border: 1px solid #3a3a3a;
  border-radius: 0.75rem 0.75rem 0.75rem 0.25rem;
}

.chat-message__text {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  font-size: 0.95rem;
  line-height: 1.4;
}
</style>
