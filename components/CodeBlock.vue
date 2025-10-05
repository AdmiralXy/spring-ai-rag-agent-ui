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
.code-wrapper {
  position: relative;
  margin: 1rem 0;
  border: 1px solid #2a2a2a;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: #171717;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
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
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  font-size: 0.75rem;
  background-color: rgba(255, 255, 255, 0.08);
  color: #f8f8f2;
  border: none;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  z-index: 5;
}
.copy-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
.code-block {
  background: transparent;
  color: #f8f8f2;
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre;
}
.code-block code {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  background: none;
  color: inherit;
  display: block;
}
</style>
