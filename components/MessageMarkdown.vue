<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '~/utils/markdown'

const props = defineProps<{ content: string }>()

const html = computed(() => renderMarkdown(props.content))

async function onClick(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]')
  if (!button) return

  const code = button.closest('.md-code')?.querySelector('pre')?.innerText ?? ''
  try {
    await navigator.clipboard.writeText(code)
    const label = button.querySelector('span')
    if (label) {
      label.textContent = 'Copied'
      setTimeout(() => (label.textContent = 'Copy'), 1500)
    }
  } catch {
    // clipboard unavailable (non-secure context)
  }
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- markdown-it runs with html: false, input is escaped -->
  <div class="md" @click="onClick" v-html="html"></div>
</template>
