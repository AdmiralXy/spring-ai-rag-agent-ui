<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount, onMounted } from 'vue'

const props = defineProps<{
  code: string
  idx?: number
}>()

const copied = ref(false)
const codeEl = ref<HTMLElement | null>(null)
const { $hljs } = useNuxtApp()

let lastHighlight = 0
let throttleTimer: ReturnType<typeof setTimeout> | null = null

async function highlightNow() {
  await nextTick()
  if (!codeEl.value) return

  const code = props.code?.trimEnd() ?? ''
  const result = $hljs.highlightAuto(code)

  codeEl.value.innerHTML = result.value
  codeEl.value.className = `hljs language-${result.language || 'plaintext'}`
  lastHighlight = Date.now()
}

function scheduleHighlight() {
  const now = Date.now()
  const elapsed = now - lastHighlight

  if (elapsed > 100) {
    highlightNow()
  } else {
    if (throttleTimer) clearTimeout(throttleTimer)
    throttleTimer = setTimeout(highlightNow, 100 - elapsed)
  }
}

watch(
  () => props.code,
  () => scheduleHighlight(),
  { immediate: true }
)

onMounted(highlightNow)
onBeforeUnmount(() => {
  if (throttleTimer) clearTimeout(throttleTimer)
})

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    console.error('Failed to copy code')
  }
}
</script>

<template>
  <div class="code-wrapper">
    <button class="copy-btn" @click="copy">
      <span v-if="copied">✅ Copied!</span>
      <span v-else>📋 Copy</span>
    </button>
    <pre class="code-block"><code ref="codeEl"></code></pre>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.code-wrapper {
  @apply relative my-4 max-w-[100%] rounded-lg border border-[#2a2a2a] bg-[#171717] shadow-md;
  animation: codeEnter 0.3s ease;
}

@keyframes codeEnter {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.copy-btn {
  @apply absolute top-1 right-1 z-10 cursor-pointer rounded border-none bg-white/10 px-2 py-1 text-xs text-gray-100 transition-colors duration-200;
}
.copy-btn:hover {
  @apply bg-white/20;
}

.code-block {
  @apply m-0 bg-transparent p-4 font-mono text-sm leading-relaxed whitespace-pre text-[#f8f8f2];
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}

.code-block code {
  display: inline-block;
  min-width: 100%;
  max-width: none;
  width: max-content;
  box-sizing: border-box;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  background: none;
  color: inherit;
  white-space: pre;
  overflow-wrap: normal;
  word-break: normal;
}
</style>
