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

        <CodeBlock v-else-if="part.type === 'code'" :code="part.content" :idx="idx" />

        <div v-else-if="part.type === 'delimiter'" class="chat-message__delimiter"></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.chat-message {
  @apply w-full max-w-full px-4 py-2;
  box-sizing: border-box;
}

.chat-message__bubble {
  @apply w-full max-w-full px-4 py-3 break-words whitespace-pre-wrap;
  border-radius: 0.75rem 0.75rem 0.75rem 0;
  overflow-x: hidden;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.chat-message--user .chat-message__bubble {
  @apply bg-[#323232d9] text-white;
}
.chat-message--assistant .chat-message__bubble {
  @apply border border-[#3a3a3a] bg-[#1d1d1d] text-gray-200;
}

.chat-message__text {
  @apply text-[0.95rem] leading-snug break-words whitespace-pre-wrap;
}

:deep(.code-wrapper) {
  @apply w-full max-w-full overflow-x-hidden;
}
:deep(.code-block) {
  @apply w-full max-w-full overflow-x-hidden break-words whitespace-pre-wrap;
}
:deep(.code-block code) {
  @apply block w-full max-w-full break-words whitespace-pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
</style>
