<script setup lang="ts">
import { useMessageParts } from '~/composables/useMessageParts'
import { ref, computed } from 'vue'

const props = defineProps<{
  role: 'USER' | 'ASSISTANT' | string
  content: string
  loading?: boolean
}>()

const parts = computed(() => useMessageParts(props.content))

const copiedIndex = ref<number | null>(null)
async function copyToClipboard(text: string | undefined, idx: number) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedIndex.value = idx
    setTimeout(() => (copiedIndex.value = null), 2000)
  } catch (err) {
    console.error('Cannot copy', err)
  }
}
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
          role="heading"
          :aria-level="part.level || 2"
        >
          {{ part.content }}
        </div>

        <span v-else-if="part.type === 'text'" class="chat-message__text">
          {{ part.content }}
        </span>

        <strong v-else-if="part.type === 'bold'" class="chat-message__text chat-message__bold">
          {{ part.content }}
        </strong>

        <div v-else-if="part.type === 'code'" class="chat-message__code-wrapper">
          <button
            class="chat-message__copy"
            :aria-label="copiedIndex === idx ? 'Copied' : 'Copy code to clipboard'"
            @click="copyToClipboard(part.content, idx)"
          >
            <span v-if="copiedIndex === idx">✅ Copied!</span>
            <span v-else>📋 Copy</span>
          </button>
          <pre class="chat-message__code"><code>{{ part.content }}</code></pre>
        </div>

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
  min-height: calc(0.25rem * 8);
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

.chat-message__heading {
  font-weight: 700;
  line-height: 1.25;
  margin: 1rem 0 0.35rem;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.chat-message__heading--l1 {
  font-size: 1.25rem;
}
.chat-message__heading--l2 {
  font-size: 1.15rem;
}
.chat-message__heading--l3 {
  font-size: 1.08rem;
}
.chat-message__heading--l4,
.chat-message__heading--l5,
.chat-message__heading--l6 {
  font-size: 1.02rem;
}

.chat-message__delimiter {
  height: 0.5rem;
}

.chat-message__bold {
  font-weight: bold;
}

.chat-message__code-wrapper {
  position: relative;
  margin: 0.5rem 0 1rem;
}

.chat-message__code {
  background-color: #171717;
  color: #f8f8f2;
  font-size: 0.9rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  line-height: 1.5;
  margin: 0;
  padding: 1rem;
  white-space: pre;
  max-width: 100%;
  tab-size: 2;
}

.chat-message__code code {
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
}

.chat-message__copy {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.75rem;
  background-color: rgba(255, 255, 255, 0.1);
  color: #f8f8f2;
  border: none;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}
.chat-message__copy:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
</style>
