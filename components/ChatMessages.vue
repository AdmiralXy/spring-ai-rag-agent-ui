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
  @apply px-4 py-2 max-w-[70%];
}

.chat-message--user {
  @apply ml-auto;
}

.chat-message--assistant {
  @apply mr-auto;
}

.chat-message__bubble {
  @apply px-4 py-3 rounded-xl w-full max-w-full overflow-x-auto break-words;
}

.chat-message--user .chat-message__bubble {
  @apply bg-[#323232d9] text-white rounded-t-xl rounded-bl-md;
}
.chat-message--assistant .chat-message__bubble {
  @apply bg-[#1d1d1d] text-gray-200 border border-[#3a3a3a] rounded-t-xl rounded-br-md;
}

.chat-message__text {
  @apply whitespace-pre-wrap break-words text-[0.95rem] leading-snug;
}

.chat-message__heading {
  @apply font-bold leading-tight mt-4 mb-1 text-gray-200 whitespace-pre-wrap break-words;
}
.chat-message__heading--l1 {
  @apply text-xl;
}
.chat-message__heading--l2 {
  @apply text-lg;
}
.chat-message__heading--l3 {
  @apply text-base;
}
.chat-message__heading--l4,
.chat-message__heading--l5,
.chat-message__heading--l6 {
  @apply text-sm;
}

:deep(.code-wrapper) {
  @apply max-sm:max-w-[68vw] max-md:max-w-[83vw] overflow-x-auto;
}
:deep(.code-block) {
  @apply max-w-full overflow-x-auto;
}
:deep(.code-block code) {
  @apply inline-block min-w-full max-w-[max-content];
}

@media (max-width: theme('screens.lg')) {
  .chat-message {
    @apply w-full max-w-full;
  }
  .chat-message__bubble {
    @apply w-full max-w-full overflow-x-auto;
  }
}
</style>
